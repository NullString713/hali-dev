#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $CorridorRegistryPath,

    [Parameter(Mandatory = $true)]
    [string[]] $OccurrenceTileIndexPaths,

    [Parameter(Mandatory = $true)]
    [string] $OutputPath
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
    param([object] $Value, [string] $Path, [int] $Depth = 100)

    $parent = Split-Path -Parent $Path
    if ($parent) {
        [System.IO.Directory]::CreateDirectory($parent) | Out-Null
    }
    $json = $Value | ConvertTo-Json -Depth $Depth -Compress
    [System.IO.File]::WriteAllText(
        [System.IO.Path]::GetFullPath($Path),
        $json + [Environment]::NewLine,
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Test-BoundsIntersect {
    param([object] $A, [object] $B)

    return -not (
        [double]$A.east -lt [double]$B.west -or
        [double]$A.west -gt [double]$B.east -or
        [double]$A.north -lt [double]$B.south -or
        [double]$A.south -gt [double]$B.north
    )
}

function Resolve-TilePath {
    param([string] $IndexPath, [string] $TilePath)

    if ([System.IO.Path]::IsPathRooted($TilePath)) {
        return $TilePath
    }

    $indexDirectory = Split-Path -Parent ([System.IO.Path]::GetFullPath($IndexPath))
    $relative = $TilePath -replace '^[.]?[\\/]+', ''
    $relative = $relative -replace '^data[\\/]geojson[\\/]interpreted[\\/]', ''
    return Join-Path $indexDirectory $relative
}

function Add-LineParts {
    param(
        [object] $Geometry,
        [hashtable] $PartsByKey
    )

    if ($Geometry.type -eq 'LineString') {
        # Keep the coordinate array as one line part. Without the unary comma,
        # PowerShell enumerates the individual coordinate pairs.
        $parts = @(, $Geometry.coordinates)
    }
    elseif ($Geometry.type -eq 'MultiLineString') {
        $parts = @($Geometry.coordinates)
    }
    else {
        throw "Corridor source geometry must be LineString or MultiLineString, found '$($Geometry.type)'."
    }

    foreach ($part in $parts) {
        if (@($part).Count -lt 2) { continue }

        $forwardKey = $part | ConvertTo-Json -Depth 20 -Compress
        $reversedCoordinates = [object[]]::new($part.Count)
        for ($i = 0; $i -lt $part.Count; $i++) {
            $reversedCoordinates[$i] = $part[$part.Count - 1 - $i]
        }
        $reverseKey = $reversedCoordinates | ConvertTo-Json -Depth 20 -Compress
        $canonicalKey = if ([string]::CompareOrdinal($forwardKey, $reverseKey) -le 0) {
            $forwardKey
        }
        else {
            $reverseKey
        }

        if (-not $PartsByKey.ContainsKey($canonicalKey)) {
            # Preserve the first source coordinate order; only the dictionary key
            # is direction-independent.
            $PartsByKey[$canonicalKey] = $part
        }
    }
}

function Test-NumericOrdinate {
    param([object] $Value)

    return $Value -is [byte] -or
        $Value -is [sbyte] -or
        $Value -is [int16] -or
        $Value -is [uint16] -or
        $Value -is [int32] -or
        $Value -is [uint32] -or
        $Value -is [int64] -or
        $Value -is [uint64] -or
        $Value -is [single] -or
        $Value -is [double] -or
        $Value -is [decimal]
}

function Assert-MultiLineStringStructure {
    param(
        [object] $Feature,
        [string] $CorridorId
    )

    if ($Feature.geometry.type -ne 'MultiLineString') {
        throw "Corridor $CorridorId geometry must be MultiLineString."
    }
    if (-not ($Feature.geometry.coordinates -is [System.Array])) {
        throw "Corridor $CorridorId coordinates must be an array of line parts."
    }

    $lineParts = [object[]]$Feature.geometry.coordinates
    if ($lineParts.Count -eq 0) {
        throw "Corridor $CorridorId MultiLineString must contain at least one line part."
    }

    for ($lineIndex = 0; $lineIndex -lt $lineParts.Count; $lineIndex++) {
        $linePart = $lineParts[$lineIndex]
        if (-not ($linePart -is [System.Array])) {
            throw "Corridor $CorridorId line part $lineIndex is not an array."
        }

        $coordinatePairs = [object[]]$linePart
        if ($coordinatePairs.Count -lt 2) {
            throw "Corridor $CorridorId line part $lineIndex contains fewer than two coordinate pairs."
        }

        for ($pointIndex = 0; $pointIndex -lt $coordinatePairs.Count; $pointIndex++) {
            $pair = $coordinatePairs[$pointIndex]
            if (-not ($pair -is [System.Array]) -or $pair.Count -lt 2) {
                throw "Corridor $CorridorId line part $lineIndex point $pointIndex is not a coordinate pair."
            }
            if (-not (Test-NumericOrdinate $pair[0]) -or -not (Test-NumericOrdinate $pair[1])) {
                throw "Corridor $CorridorId line part $lineIndex point $pointIndex does not contain numeric XY ordinates."
            }
        }
    }
}

$registry = Read-JsonFile $CorridorRegistryPath
if (-not $registry.corridors) {
    throw "Corridor registry has no corridors: $CorridorRegistryPath"
}

$corridorsById = @{}
$occurrenceToCorridor = @{}
$corridorParts = @{}
$corridorSourceTiles = @{}
$corridorSourceFeatureCounts = @{}

foreach ($corridor in $registry.corridors) {
    $corridorId = [string]$corridor.corridor_id
    if ($corridorsById.ContainsKey($corridorId)) {
        throw "Duplicate corridor_id in registry: $corridorId"
    }
    $corridorsById[$corridorId] = $corridor
    $corridorParts[$corridorId] = @{}
    $corridorSourceTiles[$corridorId] = [System.Collections.Generic.HashSet[string]]::new()
    $corridorSourceFeatureCounts[$corridorId] = 0

    foreach ($occurrenceId in $corridor.member_occurrence_ids) {
        $id = [string]$occurrenceId
        if ($occurrenceToCorridor.ContainsKey($id)) {
            throw "Occurrence belongs to multiple corridors: $id"
        }
        $occurrenceToCorridor[$id] = $corridorId
    }
}

$foundOccurrenceIds = [System.Collections.Generic.HashSet[string]]::new()
$corridorBounds = @($registry.corridors | ForEach-Object { $_.bounds })

foreach ($indexPath in @($OccurrenceTileIndexPaths | Sort-Object)) {
    $tileDefinitions = @(Read-JsonFile $indexPath | Sort-Object key, path)
    foreach ($tileDefinition in $tileDefinitions) {
        if (-not $tileDefinition.bounds) { continue }
        $needed = $false
        foreach ($bounds in $corridorBounds) {
            if (Test-BoundsIntersect $tileDefinition.bounds $bounds) {
                $needed = $true
                break
            }
        }
        if (-not $needed) { continue }

        $tilePath = Resolve-TilePath $indexPath ([string]$tileDefinition.path)
        $tile = Read-JsonFile $tilePath
        foreach ($feature in $tile.features) {
            $occurrenceId = [string]$feature.properties.occurrence_id
            if (-not $occurrenceToCorridor.ContainsKey($occurrenceId)) { continue }

            $corridorId = $occurrenceToCorridor[$occurrenceId]
            Add-LineParts -Geometry $feature.geometry -PartsByKey $corridorParts[$corridorId]
            $null = $corridorSourceTiles[$corridorId].Add([System.IO.Path]::GetFullPath($tilePath))
            $corridorSourceFeatureCounts[$corridorId]++
            $null = $foundOccurrenceIds.Add($occurrenceId)
        }
    }
}

$missing = @($occurrenceToCorridor.Keys | Where-Object { -not $foundOccurrenceIds.Contains($_) } | Sort-Object)
if ($missing.Count -gt 0) {
    throw "No occurrence tile geometry was found for: $($missing -join ', ')"
}

$features = [System.Collections.Generic.List[object]]::new()
$report = [System.Collections.Generic.List[object]]::new()
foreach ($corridor in $registry.corridors) {
    $corridorId = [string]$corridor.corridor_id
    [string[]]$orderedPartKeys = @($corridorParts[$corridorId].Keys)
    [Array]::Sort($orderedPartKeys, [StringComparer]::Ordinal)
    $orderedParts = [System.Collections.Generic.List[object]]::new()
    foreach ($partKey in $orderedPartKeys) {
        # List.Add stores the complete coordinate array as one element. Emitting
        # it through a PowerShell pipeline would flatten the line-part level.
        $orderedParts.Add([object]$corridorParts[$corridorId][$partKey])
    }
    if ($orderedParts.Count -eq 0) {
        throw "Corridor has no line parts: $corridorId"
    }

    $sourceTileCount = $corridorSourceTiles[$corridorId].Count
    $sourceFeatureCount = [int]$corridorSourceFeatureCounts[$corridorId]
    $uniqueLinePartCount = $orderedParts.Count

    $lineageKey = if (@($corridor.lineageKeys).Count -eq 1) { [string]$corridor.lineageKeys[0] } else { 'statewideContext' }
    $properties = [ordered]@{
        corridor_id           = $corridorId
        water_id              = $corridorId
        display_name          = [string]$corridor.display_name
        normalized_name       = [string]$corridor.normalized_name
        state                 = [string]$corridor.state
        atlas_layer           = 'named_water_corridor'
        object_role           = 'named_water_corridor'
        atlas_class           = 'named_water_corridor'
        member_occurrence_ids = @($corridor.member_occurrence_ids)
        occurrence_count      = [int]$corridor.occurrence_count
        huc8s                  = @($corridor.huc8s)
        huc8Names              = @($corridor.huc8Names)
        lineageKeys           = @($corridor.lineageKeys)
        lineageKey            = $lineageKey
        lineage               = $lineageKey
        historic              = $lineageKey
        current               = $lineageKey
        recovery              = $lineageKey
        minZoom               = [int]$corridor.minZoom
        maxZoom               = [int]$corridor.maxZoom
        bounds                = $corridor.bounds
        center                = $corridor.center
        source_tile_count     = $sourceTileCount
        source_feature_count  = $sourceFeatureCount
        unique_line_part_count = $uniqueLinePartCount
        geometry_status_public = 'Aggregate named-water corridor'
        geometry_source_public = 'Grouped Atlas named-water occurrence geometry'
    }

    $feature = [ordered]@{
        type       = 'Feature'
        properties = $properties
        geometry   = [ordered]@{
            type        = 'MultiLineString'
            coordinates = $orderedParts.ToArray()
        }
    }
    Assert-MultiLineStringStructure -Feature $feature -CorridorId $corridorId
    $features.Add($feature)

    $report.Add([pscustomobject]@{
        Corridor          = [string]$corridor.display_name
        SourceTiles       = $sourceTileCount
        SourceFeatures    = $sourceFeatureCount
        UniqueLineParts   = $uniqueLinePartCount
    })
}

$output = [ordered]@{
    type     = 'FeatureCollection'
    name     = 'Colorado named-water corridors v1 pilot'
    features = @($features)
}

Write-JsonFile -Value $output -Path $OutputPath
$report | Format-Table -AutoSize | Out-Host
Write-Host "Wrote $($features.Count) pilot corridor features to $OutputPath"
