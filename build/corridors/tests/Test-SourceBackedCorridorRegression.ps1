#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $BaselineRoot,

    [Parameter(Mandatory = $true)]
    [string[]] $CandidateRoots
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$registryName = 'colorado_named_water_corridor_registry_v1.json'
$geometryName = 'colorado_named_water_corridors_v1.geojson'
$tileIndexName = 'colorado_named_water_corridors_v1_tile_index.json'
$tileDirectoryName = 'colorado_named_water_corridors_v1_tiles'
$corridorIds = @(
    'co_corridor_cache_la_poudre_river',
    'co_corridor_colorado_river',
    'co_corridor_rio_grande',
    'co_corridor_arkansas_river'
)
$sourceBackedIds = @(
    'co_corridor_cache_la_poudre_river',
    'co_corridor_colorado_river'
)

function Read-JsonFile {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing regression artifact: $Path"
    }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function ConvertTo-CanonicalValue {
    param([AllowNull()][object] $Value)

    if ($null -eq $Value) { return $null }
    if ($Value -is [string] -or $Value -is [ValueType]) { return $Value }
    if ($Value -is [System.Collections.IDictionary]) {
        $ordered = [ordered]@{}
        foreach ($key in @($Value.Keys | ForEach-Object { [string]$_ } | Sort-Object)) {
            $ordered[$key] = ConvertTo-CanonicalValue $Value[$key]
        }
        return $ordered
    }
    if ($Value -is [System.Collections.IEnumerable] -and $Value -isnot [pscustomobject]) {
        $items = [System.Collections.Generic.List[object]]::new()
        foreach ($item in $Value) { $items.Add((ConvertTo-CanonicalValue $item)) }
        return $items.ToArray()
    }

    $ordered = [ordered]@{}
    foreach ($name in @($Value.PSObject.Properties.Name | Sort-Object)) {
        $ordered[$name] = ConvertTo-CanonicalValue $Value.$name
    }
    return $ordered
}

function Get-CanonicalJson {
    param([object] $Value)
    return ConvertTo-CanonicalValue $Value | ConvertTo-Json -Depth 100 -Compress
}

function Assert-EqualJsonValue {
    param(
        [string] $Label,
        [object] $Expected,
        [object] $Actual
    )
    if ((Get-CanonicalJson $Expected) -cne (Get-CanonicalJson $Actual)) {
        throw "Semantic regression: $Label"
    }
}

function Get-FeaturesByCorridorId {
    param([object] $FeatureCollection)
    $result = @{}
    foreach ($feature in @($FeatureCollection.features)) {
        $id = [string]$feature.properties.corridor_id
        if ($result.ContainsKey($id)) { throw "Duplicate corridor feature: $id" }
        $result[$id] = $feature
    }
    return $result
}

function Get-RegistryByCorridorId {
    param([object] $Registry)
    $result = @{}
    foreach ($corridor in @($Registry.corridors)) {
        $id = [string]$corridor.corridor_id
        if ($result.ContainsKey($id)) { throw "Duplicate registry corridor: $id" }
        $result[$id] = $corridor
    }
    return $result
}

function Compare-ArtifactBytes {
    param([string] $Baseline, [string] $Candidate)

    $baselineFiles = @(Get-ChildItem -LiteralPath $Baseline -File -Recurse | ForEach-Object {
        $_.FullName.Substring((Resolve-Path $Baseline).Path.Length).TrimStart('\', '/')
    } | Sort-Object)
    $candidateFiles = @(Get-ChildItem -LiteralPath $Candidate -File -Recurse | ForEach-Object {
        $_.FullName.Substring((Resolve-Path $Candidate).Path.Length).TrimStart('\', '/')
    } | Sort-Object)
    if (($baselineFiles -join "`n") -ne ($candidateFiles -join "`n")) {
        throw "Semantic regression: artifact filename sets differ for $Candidate"
    }

    $byteDifferences = [System.Collections.Generic.List[string]]::new()
    foreach ($relativePath in $baselineFiles) {
        $baselineHash = (Get-FileHash -LiteralPath (Join-Path $Baseline $relativePath) -Algorithm SHA256).Hash
        $candidateHash = (Get-FileHash -LiteralPath (Join-Path $Candidate $relativePath) -Algorithm SHA256).Hash
        if ($baselineHash -ne $candidateHash) { $byteDifferences.Add($relativePath) }
    }
    return $byteDifferences
}

function Compare-CorridorBuild {
    param([string] $Baseline, [string] $Candidate)

    $baselineRegistry = Read-JsonFile (Join-Path $Baseline $registryName)
    $candidateRegistry = Read-JsonFile (Join-Path $Candidate $registryName)
    $baselineRegistryById = Get-RegistryByCorridorId $baselineRegistry
    $candidateRegistryById = Get-RegistryByCorridorId $candidateRegistry
    foreach ($id in $corridorIds) {
        if (-not $baselineRegistryById.ContainsKey($id) -or -not $candidateRegistryById.ContainsKey($id)) {
            throw "Semantic regression: registry corridor missing: $id"
        }
        Assert-EqualJsonValue "registry record $id" $baselineRegistryById[$id] $candidateRegistryById[$id]
        Assert-EqualJsonValue "member occurrence IDs $id" $baselineRegistryById[$id].member_occurrence_ids $candidateRegistryById[$id].member_occurrence_ids
    }

    $baselineGeometry = Read-JsonFile (Join-Path $Baseline $geometryName)
    $candidateGeometry = Read-JsonFile (Join-Path $Candidate $geometryName)
    $baselineFeatures = Get-FeaturesByCorridorId $baselineGeometry
    $candidateFeatures = Get-FeaturesByCorridorId $candidateGeometry
    foreach ($id in $corridorIds) {
        if (-not $baselineFeatures.ContainsKey($id) -or -not $candidateFeatures.ContainsKey($id)) {
            throw "Semantic regression: corridor geometry missing: $id"
        }
        Assert-EqualJsonValue "corridor properties $id" $baselineFeatures[$id].properties $candidateFeatures[$id].properties
        Assert-EqualJsonValue "corridor geometry $id" $baselineFeatures[$id].geometry $candidateFeatures[$id].geometry
    }
    foreach ($id in $sourceBackedIds) {
        Assert-EqualJsonValue "exact source-backed coordinates $id" $baselineFeatures[$id].geometry.coordinates $candidateFeatures[$id].geometry.coordinates
    }

    $baselineIndex = Read-JsonFile (Join-Path $Baseline $tileIndexName)
    $candidateIndex = Read-JsonFile (Join-Path $Candidate $tileIndexName)
    Assert-EqualJsonValue 'tile index entries' $baselineIndex $candidateIndex

    $baselineTileRoot = Join-Path $Baseline $tileDirectoryName
    $candidateTileRoot = Join-Path $Candidate $tileDirectoryName
    $baselineTiles = @(Get-ChildItem -LiteralPath $baselineTileRoot -File | Sort-Object Name)
    $candidateTileNames = @(Get-ChildItem -LiteralPath $candidateTileRoot -File | ForEach-Object Name | Sort-Object)
    if (($baselineTiles.Name -join "`n") -ne ($candidateTileNames -join "`n")) {
        throw 'Semantic regression: corridor tile filename sets differ.'
    }
    foreach ($baselineTile in $baselineTiles) {
        $candidateTilePath = Join-Path $candidateTileRoot $baselineTile.Name
        $baselineTileJson = Read-JsonFile $baselineTile.FullName
        $candidateTileJson = Read-JsonFile $candidateTilePath
        Assert-EqualJsonValue "tile membership and geometry $($baselineTile.Name)" $baselineTileJson $candidateTileJson
    }

    $byteDifferences = @(Compare-ArtifactBytes $Baseline $Candidate)
    Write-Host "Semantic comparison passed: $Candidate"
    if ($byteDifferences.Count -eq 0) {
        Write-Host 'Byte comparison passed: all artifacts are identical.'
    }
    else {
        Write-Host "Byte-only differences ($($byteDifferences.Count)):"
        $byteDifferences | ForEach-Object { Write-Host "  $_" }
    }
}

$resolvedBaseline = (Resolve-Path -LiteralPath $BaselineRoot).Path
foreach ($candidateRoot in $CandidateRoots) {
    $resolvedCandidate = (Resolve-Path -LiteralPath $candidateRoot).Path
    Compare-CorridorBuild -Baseline $resolvedBaseline -Candidate $resolvedCandidate
}

if ($CandidateRoots.Count -gt 1) {
    $first = (Resolve-Path -LiteralPath $CandidateRoots[0]).Path
    foreach ($otherRoot in $CandidateRoots[1..($CandidateRoots.Count - 1)]) {
        Compare-CorridorBuild -Baseline $first -Candidate (Resolve-Path -LiteralPath $otherRoot).Path
    }
    Write-Host 'Deterministic multi-run comparison passed.'
}
