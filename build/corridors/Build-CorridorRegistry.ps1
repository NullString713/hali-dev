#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $OccurrenceRegistryPath,

    [string] $OverridePath = (Join-Path $PSScriptRoot 'config\colorado_named_water_corridor_overrides_v1.json'),

    [Parameter(Mandatory = $true)]
    [string] $OutputPath,

    [int] $MinZoom = 8,

    [int] $MaxZoom = 18
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Read-JsonFile {
    param([string] $Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "JSON input does not exist: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-JsonFile {
    param(
        [object] $Value,
        [string] $Path,
        [int] $Depth = 12
    )

    $parent = Split-Path -Parent $Path
    if ($parent) {
        [System.IO.Directory]::CreateDirectory($parent) | Out-Null
    }

    $json = $Value | ConvertTo-Json -Depth $Depth
    [System.IO.File]::WriteAllText(
        [System.IO.Path]::GetFullPath($Path),
        $json + [Environment]::NewLine,
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Get-UnionBounds {
    param([object[]] $Occurrences)

    $bounded = @($Occurrences | Where-Object { $null -ne $_.bounds })
    if ($bounded.Count -ne $Occurrences.Count) {
        throw 'Every pilot occurrence must have registry bounds.'
    }

    return [ordered]@{
        west  = [double](($bounded | ForEach-Object { [double]$_.bounds.west } | Measure-Object -Minimum).Minimum)
        south = [double](($bounded | ForEach-Object { [double]$_.bounds.south } | Measure-Object -Minimum).Minimum)
        east  = [double](($bounded | ForEach-Object { [double]$_.bounds.east } | Measure-Object -Maximum).Maximum)
        north = [double](($bounded | ForEach-Object { [double]$_.bounds.north } | Measure-Object -Maximum).Maximum)
    }
}

$registry = Read-JsonFile $OccurrenceRegistryPath
$overrides = Read-JsonFile $OverridePath

if (-not $registry.occurrences) {
    throw "Occurrence registry has no occurrences array: $OccurrenceRegistryPath"
}

if (-not $overrides.corridors -or @($overrides.corridors).Count -eq 0) {
    throw "Pilot override file has no corridors: $OverridePath"
}

$occurrencesById = @{}
foreach ($occurrence in $registry.occurrences) {
    $id = [string]$occurrence.occurrence_id
    if ([string]::IsNullOrWhiteSpace($id)) {
        throw 'Occurrence registry contains an occurrence without occurrence_id.'
    }
    if ($occurrencesById.ContainsKey($id)) {
        throw "Duplicate occurrence_id in source registry: $id"
    }
    $occurrencesById[$id] = $occurrence
}

$seenCorridorIds = [System.Collections.Generic.HashSet[string]]::new()
$assignedOccurrenceIds = [System.Collections.Generic.HashSet[string]]::new()
$corridors = [System.Collections.Generic.List[object]]::new()

foreach ($definition in $overrides.corridors) {
    $corridorId = [string]$definition.corridor_id
    $displayName = [string]$definition.display_name
    $normalizedName = [string]$definition.normalized_name
    $memberIds = @($definition.member_occurrence_ids | ForEach-Object { [string]$_ })

    if ([string]::IsNullOrWhiteSpace($corridorId) -or
        [string]::IsNullOrWhiteSpace($displayName) -or
        [string]::IsNullOrWhiteSpace($normalizedName)) {
        throw 'Every pilot corridor requires corridor_id, display_name, and normalized_name.'
    }
    if (-not $seenCorridorIds.Add($corridorId)) {
        throw "Duplicate corridor_id in pilot overrides: $corridorId"
    }
    if ($memberIds.Count -eq 0) {
        throw "Pilot corridor has no member occurrences: $corridorId"
    }

    $members = [System.Collections.Generic.List[object]]::new()
    foreach ($memberId in $memberIds) {
        if (-not $occurrencesById.ContainsKey($memberId)) {
            throw "Pilot corridor $corridorId references unknown occurrence_id: $memberId"
        }
        if (-not $assignedOccurrenceIds.Add($memberId)) {
            throw "Occurrence is assigned to more than one pilot corridor: $memberId"
        }

        $member = $occurrencesById[$memberId]
        if ([string]$member.normalized_name -ne $normalizedName) {
            throw "Occurrence $memberId has normalized_name '$($member.normalized_name)', expected '$normalizedName'."
        }
        $members.Add($member)
    }

    $states = @($members | ForEach-Object { [string]$_.state } | Where-Object { $_ } | Sort-Object -Unique)
    if ($states.Count -ne 1 -or $states[0] -ne [string]$overrides.state) {
        throw "Pilot corridor $corridorId does not resolve to exactly state $($overrides.state)."
    }

    $bounds = Get-UnionBounds $members.ToArray()
    $corridors.Add([ordered]@{
        corridor_id          = $corridorId
        display_name         = $displayName
        normalized_name      = $normalizedName
        state                = $states[0]
        member_occurrence_ids = @($memberIds)
        occurrence_count     = $memberIds.Count
        huc8s                 = @($members | ForEach-Object { [string]$_.huc8 } | Where-Object { $_ } | Sort-Object -Unique)
        huc8Names             = @($members | ForEach-Object { [string]$_.huc8Name } | Where-Object { $_ } | Sort-Object -Unique)
        lineageKeys          = @($members | ForEach-Object { [string]$_.lineageKey } | Where-Object { $_ } | Sort-Object -Unique)
        lineageLabels        = @($members | ForEach-Object { [string]$_.lineageLabel } | Where-Object { $_ } | Sort-Object -Unique)
        segment_count        = [int](($members | Measure-Object -Property segment_count -Sum).Sum)
        minZoom              = $MinZoom
        maxZoom              = $MaxZoom
        bounds               = $bounds
        center               = [ordered]@{
            lng = [Math]::Round(($bounds.west + $bounds.east) / 2, 6)
            lat = [Math]::Round(($bounds.south + $bounds.north) / 2, 6)
        }
    })
}

$output = [ordered]@{
    metadata = [ordered]@{
        name                 = 'Colorado named-water corridor registry v1 pilot'
        state                = [string]$overrides.state
        state_slug           = [string]$overrides.state_slug
        version              = [string]$overrides.version
        source_registry      = [System.IO.Path]::GetFullPath($OccurrenceRegistryPath)
        corridor_count       = $corridors.Count
        occurrence_count     = $assignedOccurrenceIds.Count
        pilot                = $true
    }
    corridors = @($corridors)
}

Write-JsonFile -Value $output -Path $OutputPath
Write-Host "Wrote $($corridors.Count) pilot corridors to $OutputPath"
