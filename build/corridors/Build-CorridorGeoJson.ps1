#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $CorridorRegistryPath,

    [Parameter(Mandatory = $true)]
    [string[]] $OccurrenceTileIndexPaths,

    [string] $OverridePath = (Join-Path $PSScriptRoot 'config\colorado_named_water_corridor_overrides_v1.json'),

    [string] $HydrographyGeoPackagePath,

    [string] $Ogr2OgrPath = 'C:\OSGeo4W\bin\ogr2ogr.exe',

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

function Normalize-WaterName {
    param([object] $Value)

    return (([string]$Value).Trim() -replace '\s+', ' ').ToLowerInvariant()
}

function Get-CanonicalLineKey {
    param([object[]] $Coordinates)

    $forwardKey = $Coordinates | ConvertTo-Json -Depth 20 -Compress
    $reversedCoordinates = [object[]]::new($Coordinates.Count)
    for ($i = 0; $i -lt $Coordinates.Count; $i++) {
        $reversedCoordinates[$i] = $Coordinates[$Coordinates.Count - 1 - $i]
    }
    $reverseKey = $reversedCoordinates | ConvertTo-Json -Depth 20 -Compress
    if ([string]::CompareOrdinal($forwardKey, $reverseKey) -le 0) {
        return $forwardKey
    }
    return $reverseKey
}

function Get-EndpointKey {
    param([object] $Point)

    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    return '{0},{1}' -f `
        ([double]$Point[0]).ToString('R', $culture), `
        ([double]$Point[1]).ToString('R', $culture)
}

function Get-PointToLinePartDistanceMeters {
    param(
        [object] $Point,
        [object[]] $LinePart
    )

    $latitudeRadians = [double]$Point[1] * [Math]::PI / 180.0
    $longitudeScale = 111320.0 * [Math]::Cos($latitudeRadians)
    $latitudeScale = 110540.0
    $minimumDistance = [double]::PositiveInfinity

    for ($i = 1; $i -lt $LinePart.Count; $i++) {
        $ax = ([double]$LinePart[$i - 1][0] - [double]$Point[0]) * $longitudeScale
        $ay = ([double]$LinePart[$i - 1][1] - [double]$Point[1]) * $latitudeScale
        $bx = ([double]$LinePart[$i][0] - [double]$Point[0]) * $longitudeScale
        $by = ([double]$LinePart[$i][1] - [double]$Point[1]) * $latitudeScale
        $dx = $bx - $ax
        $dy = $by - $ay
        $lengthSquared = $dx * $dx + $dy * $dy
        $t = if ($lengthSquared -le 0.0) { 0.0 } else { -($ax * $dx + $ay * $dy) / $lengthSquared }
        $t = [Math]::Max(0.0, [Math]::Min(1.0, $t))
        $closestX = $ax + $t * $dx
        $closestY = $ay + $t * $dy
        $distance = [Math]::Sqrt($closestX * $closestX + $closestY * $closestY)
        if ($distance -lt $minimumDistance) { $minimumDistance = $distance }
    }

    return $minimumDistance
}

function Invoke-OgrGeoJsonQuery {
    param(
        [string] $ExecutablePath,
        [string] $GeoPackagePath,
        [string] $Sql
    )

    if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
        throw "ogr2ogr executable does not exist: $ExecutablePath"
    }
    if (-not (Test-Path -LiteralPath $GeoPackagePath -PathType Leaf)) {
        throw "Hydrography GeoPackage does not exist: $GeoPackagePath"
    }

    $jsonLines = @(& $ExecutablePath `
        '-f' 'GeoJSON' `
        '/vsistdout/' `
        $GeoPackagePath `
        '-dialect' 'SQLite' `
        '-sql' $Sql `
        '-dim' 'XY' 2>$null)
    if ($LASTEXITCODE -ne 0) {
        throw "ogr2ogr source query failed with exit code $LASTEXITCODE."
    }

    $json = $jsonLines -join [Environment]::NewLine
    if ([string]::IsNullOrWhiteSpace($json)) {
        throw 'ogr2ogr source query returned no GeoJSON.'
    }
    return $json | ConvertFrom-Json
}

function Get-LineCollectionStats {
    param(
        [object[]] $LineParts,
        [double] $SourceLengthKm
    )

    $west = [double]::PositiveInfinity
    $south = [double]::PositiveInfinity
    $east = [double]::NegativeInfinity
    $north = [double]::NegativeInfinity
    $vertexCount = 0

    foreach ($part in $LineParts) {
        foreach ($point in [object[]]$part) {
            $vertexCount++
            $x = [double]$point[0]
            $y = [double]$point[1]
            if ($x -lt $west) { $west = $x }
            if ($x -gt $east) { $east = $x }
            if ($y -lt $south) { $south = $y }
            if ($y -gt $north) { $north = $y }
        }
    }

    if ($vertexCount -eq 0) {
        throw 'Cannot calculate source-backed corridor statistics without vertices.'
    }

    $bounds = [ordered]@{
        west  = $west
        south = $south
        east  = $east
        north = $north
    }
    return [pscustomobject]@{
        bounds           = $bounds
        center           = [ordered]@{
            lng = [Math]::Round(($west + $east) / 2.0, 6)
            lat = [Math]::Round(($south + $north) / 2.0, 6)
        }
        vertex_count     = $vertexCount
        source_length_km = [Math]::Round($SourceLengthKm, 3)
    }
}

function Set-ObjectProperty {
    param(
        [object] $Object,
        [string] $Name,
        [object] $Value
    )

    if ($Object.PSObject.Properties.Name -contains $Name) {
        $Object.$Name = $Value
    }
    else {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
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

function Build-SourceBackedCorridor {
    param(
        [object] $Corridor,
        [object] $Definition,
        [hashtable] $AnchorPartsByOccurrence,
        [string] $GeoPackagePath,
        [string] $OgrExecutablePath
    )

    $corridorId = [string]$Corridor.corridor_id
    $sourceDefinition = $Definition.source_backed_geometry
    $gnisId = [string]$sourceDefinition.gnis_id
    $normalizedSourceName = Normalize-WaterName $sourceDefinition.normalized_source_name
    [int[]]$allowedFTypes = @($sourceDefinition.allowed_ftypes | ForEach-Object { [int]$_ } | Sort-Object -Unique)
    $requireInNetwork = [bool]$sourceDefinition.require_in_network
    $anchorRequired = [bool]$sourceDefinition.anchor_required
    $expectedFeatureCount = [int]$sourceDefinition.expected_source_feature_count

    if ($corridorId -ne 'co_corridor_cache_la_poudre_river') {
        throw "Source-backed geometry is currently limited to the Cache la Poudre pilot, found: $corridorId"
    }
    if ($gnisId -ne '00205018' -or $normalizedSourceName -ne 'cache la poudre river') {
        throw "Unexpected Cache la Poudre source identity in overrides for $corridorId."
    }
    if (($allowedFTypes -join ',') -ne '460,558') {
        throw "Cache la Poudre allowed FTypes must be exactly 460 and 558, found: $($allowedFTypes -join ', ')"
    }
    if (-not $requireInNetwork -or -not $anchorRequired) {
        throw 'Cache la Poudre source-backed geometry requires both InNetwork and occurrence anchors.'
    }
    if ($expectedFeatureCount -le 0) {
        throw 'Cache la Poudre source-backed geometry requires a positive expected source feature count.'
    }

    $escapedGnisId = $gnisId.Replace("'", "''")
    $escapedName = $normalizedSourceName.Replace("'", "''")
    $allowedFTypeSql = $allowedFTypes -join ', '
    $inNetworkSql = if ($requireInNetwork) { ' AND InNetwork = 1' } else { '' }
    $whereClause = "GNIS_ID = '$escapedGnisId' AND lower(trim(GNIS_Name)) = '$escapedName' AND FType IN ($allowedFTypeSql)$inNetworkSql"
    $selectFields = 'Shape, Permanent_Identifier, GNIS_ID, GNIS_Name, LengthKM, ReachCode, FlowDir, FType, FCode, InNetwork, NHDPlusID, VPUID'
    $sourceLayers = @('flowlines_colorado_streamriver', 'flowlines_colorado_connectors')

    $candidateFeatures = [System.Collections.Generic.List[object]]::new()
    foreach ($sourceLayer in $sourceLayers) {
        $sql = "SELECT $selectFields FROM $sourceLayer WHERE $whereClause"
        $queryResult = Invoke-OgrGeoJsonQuery `
            -ExecutablePath $OgrExecutablePath `
            -GeoPackagePath $GeoPackagePath `
            -Sql $sql
        foreach ($feature in @($queryResult.features)) {
            $candidateFeatures.Add($feature)
        }
    }

    if ($candidateFeatures.Count -ne $expectedFeatureCount) {
        throw "Cache la Poudre source feature count changed: expected $expectedFeatureCount, found $($candidateFeatures.Count). Inspect and explicitly update the pilot expectation before proceeding."
    }

    $permanentIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $nhdPlusIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $sourceRecords = [System.Collections.Generic.List[object]]::new()
    $sourceRecordsByPermanentId = @{}
    $fTypeCounts = @{}
    $sourceLengthKm = 0.0

    foreach ($feature in $candidateFeatures) {
        $properties = $feature.properties
        $featureGnisId = [string]$properties.GNIS_ID
        $featureName = Normalize-WaterName $properties.GNIS_Name
        $featureFType = [int]$properties.FType
        $featureInNetwork = [int]$properties.InNetwork
        $permanentId = [string]$properties.Permanent_Identifier
        $nhdPlusId = [string]$properties.NHDPlusID

        if ($featureGnisId -ne $gnisId) {
            throw "Source query admitted a different GNIS ID: $featureGnisId"
        }
        if ($featureName -ne $normalizedSourceName) {
            throw "Source query admitted a different normalized name: $featureName"
        }
        if ($allowedFTypes -notcontains $featureFType) {
            throw "Source query admitted forbidden FType $featureFType."
        }
        if ($requireInNetwork -and $featureInNetwork -ne 1) {
            throw "Source query admitted an out-of-network feature: $permanentId"
        }
        if ([string]::IsNullOrWhiteSpace($permanentId) -or -not $permanentIds.Add($permanentId)) {
            throw "Permanent_Identifier is missing or duplicated: '$permanentId'"
        }
        if ([string]::IsNullOrWhiteSpace($nhdPlusId) -or -not $nhdPlusIds.Add($nhdPlusId)) {
            throw "NHDPlusID is missing or duplicated: '$nhdPlusId'"
        }
        if ($feature.geometry.type -ne 'MultiLineString') {
            throw "Source feature $permanentId must be a MultiLineString, found '$($feature.geometry.type)'."
        }

        [object[]]$featureParts = $feature.geometry.coordinates
        if ($featureParts.Count -ne 1) {
            throw "Source feature $permanentId must contain exactly one original line part, found $($featureParts.Count)."
        }
        [object[]]$coordinates = $featureParts[0]
        if ($coordinates.Count -lt 2) {
            throw "Source feature $permanentId has fewer than two coordinates."
        }

        if (-not $fTypeCounts.ContainsKey($featureFType)) { $fTypeCounts[$featureFType] = 0 }
        $fTypeCounts[$featureFType]++
        $sourceLengthKm += [double]$properties.LengthKM
        $sourceRecord = [pscustomobject]@{
            feature       = $feature
            permanent_id  = $permanentId
            nhdplus_id    = $nhdPlusId
            ftype         = $featureFType
            coordinates   = $coordinates
            start_key     = Get-EndpointKey $coordinates[0]
            end_key       = Get-EndpointKey $coordinates[$coordinates.Count - 1]
        }
        $sourceRecords.Add($sourceRecord)
        $sourceRecordsByPermanentId[$permanentId] = $sourceRecord
    }

    if ($sourceRecordsByPermanentId.Count -ne $candidateFeatures.Count) {
        throw 'Source records were not keyed one-to-one by Permanent_Identifier.'
    }

    if (@($candidateFeatures | Where-Object {
        (Normalize-WaterName $_.properties.GNIS_Name) -match '^(north|south) fork '
    }).Count -ne 0) {
        throw 'Fork geometry was admitted to the Cache la Poudre candidate set.'
    }

    $nodeFeatures = @{}
    for ($featureIndex = 0; $featureIndex -lt $sourceRecords.Count; $featureIndex++) {
        $record = $sourceRecords[$featureIndex]
        foreach ($endpointKey in @($record.start_key, $record.end_key)) {
            if (-not $nodeFeatures.ContainsKey($endpointKey)) {
                $nodeFeatures[$endpointKey] = [System.Collections.Generic.List[int]]::new()
            }
            $nodeFeatures[$endpointKey].Add($featureIndex)
        }
    }

    $featureNeighbors = @{}
    for ($featureIndex = 0; $featureIndex -lt $sourceRecords.Count; $featureIndex++) {
        $featureNeighbors[$featureIndex] = [System.Collections.Generic.HashSet[int]]::new()
    }
    foreach ($incidentFeatures in $nodeFeatures.Values) {
        foreach ($left in $incidentFeatures) {
            foreach ($right in $incidentFeatures) {
                if ($left -ne $right) { $null = $featureNeighbors[$left].Add($right) }
            }
        }
    }

    $componentByFeature = @{}
    $components = [System.Collections.Generic.List[object]]::new()
    for ($featureIndex = 0; $featureIndex -lt $sourceRecords.Count; $featureIndex++) {
        if ($componentByFeature.ContainsKey($featureIndex)) { continue }
        $componentIndex = $components.Count
        $componentMembers = [System.Collections.Generic.List[int]]::new()
        $queue = [System.Collections.Generic.Queue[int]]::new()
        $queue.Enqueue($featureIndex)
        $componentByFeature[$featureIndex] = $componentIndex
        while ($queue.Count -gt 0) {
            $current = $queue.Dequeue()
            $componentMembers.Add($current)
            foreach ($neighbor in $featureNeighbors[$current]) {
                if ($componentByFeature.ContainsKey($neighbor)) { continue }
                $componentByFeature[$neighbor] = $componentIndex
                $queue.Enqueue($neighbor)
            }
        }
        $components.Add($componentMembers)
    }

    $anchorMatchCounts = [ordered]@{}
    $anchoredFeatureIndexes = [System.Collections.Generic.HashSet[int]]::new()
    foreach ($occurrenceIdValue in @($Corridor.member_occurrence_ids)) {
        $occurrenceId = [string]$occurrenceIdValue
        if (-not $AnchorPartsByOccurrence.ContainsKey($occurrenceId)) {
            throw "No occurrence geometry was loaded for required source-backed anchor: $occurrenceId"
        }

        $anchorPoints = [System.Collections.Generic.List[object]]::new()
        foreach ($anchorPart in $AnchorPartsByOccurrence[$occurrenceId].Values) {
            foreach ($anchorPoint in [object[]]$anchorPart) { $anchorPoints.Add($anchorPoint) }
        }

        $matches = [System.Collections.Generic.HashSet[int]]::new()
        for ($featureIndex = 0; $featureIndex -lt $sourceRecords.Count; $featureIndex++) {
            $record = $sourceRecords[$featureIndex]
            $matched = $false
            foreach ($anchorPoint in $anchorPoints) {
                if ((Get-PointToLinePartDistanceMeters `
                    -Point $anchorPoint `
                    -LinePart ([object[]]$record.coordinates)) -le 1.0) {
                        $null = $matches.Add($featureIndex)
                        $matched = $true
                        break
                }
            }
        }

        if ($anchorRequired -and $matches.Count -eq 0) {
            throw "Approved occurrence anchor did not touch an allowed exact-identity source line within 1 meter: $occurrenceId"
        }
        foreach ($match in $matches) { $null = $anchoredFeatureIndexes.Add($match) }
        $anchorMatchCounts[$occurrenceId] = $matches.Count
    }

    if ($anchorRequired -and $anchoredFeatureIndexes.Count -eq 0) {
        throw 'No source features were touched by the approved Cache la Poudre occurrence anchors.'
    }

    $anchoredComponentIds = @($anchoredFeatureIndexes | ForEach-Object { $componentByFeature[$_] } | Sort-Object -Unique)
    if ($anchoredComponentIds.Count -ne 1) {
        throw "Cache la Poudre anchors touch $($anchoredComponentIds.Count) candidate components; exactly one is required."
    }
    $selectedIndexes = $components[$anchoredComponentIds[0]]
    if ($selectedIndexes.Count -ne $expectedFeatureCount) {
        throw "Anchored Cache la Poudre component selected $($selectedIndexes.Count) of $expectedFeatureCount expected source features."
    }

    $selectedNodeDegrees = @{}
    foreach ($featureIndex in $selectedIndexes) {
        $record = $sourceRecords[$featureIndex]
        foreach ($endpointKey in @($record.start_key, $record.end_key)) {
            if (-not $selectedNodeDegrees.ContainsKey($endpointKey)) { $selectedNodeDegrees[$endpointKey] = 0 }
            $selectedNodeDegrees[$endpointKey]++
        }
    }
    $degreeOneCount = @($selectedNodeDegrees.Values | Where-Object { $_ -eq 1 }).Count
    $maxDegree = [int](($selectedNodeDegrees.Values | Measure-Object -Maximum).Maximum)
    if ($degreeOneCount -ne 2) {
        throw "Cache la Poudre source graph must have exactly two degree-1 nodes, found $degreeOneCount."
    }
    if ($maxDegree -gt 2) {
        throw "Cache la Poudre source graph must not branch; maximum endpoint degree is $maxDegree."
    }

    $partsByKey = @{}
    $sourcePartKeys = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($featureIndex in $selectedIndexes) {
        $coordinates = [object[]]$sourceRecords[$featureIndex].coordinates
        $canonicalKey = Get-CanonicalLineKey $coordinates
        if (-not $sourcePartKeys.Add($canonicalKey)) {
            throw "Duplicate source line geometry found for $($sourceRecords[$featureIndex].permanent_id)."
        }
        $partsByKey[$canonicalKey] = $coordinates
    }
    if ($partsByKey.Count -ne $selectedIndexes.Count) {
        throw 'Every selected source feature must contribute exactly one unique output line part.'
    }
    foreach ($outputPartKey in $partsByKey.Keys) {
        if (-not $sourcePartKeys.Contains($outputPartKey)) {
            throw 'Output contains a line that was not copied from selected source geometry.'
        }
    }

    [object[]]$selectedParts = @($partsByKey.Values)
    $lineStats = Get-LineCollectionStats -LineParts $selectedParts -SourceLengthKm $sourceLengthKm
    $geometrySourceDescription = "Source-backed NHD named mainstem from flowlines_colorado_streamriver and flowlines_colorado_connectors; GNIS_ID $gnisId; FType 460/558; exact endpoint-connected component touched by approved occurrence anchors"

    return [pscustomobject]@{
        parts_by_key                 = $partsByKey
        source_feature_count         = $selectedIndexes.Count
        unique_line_part_count       = $partsByKey.Count
        vertex_count                 = $lineStats.vertex_count
        source_length_km             = $lineStats.source_length_km
        bounds                       = $lineStats.bounds
        center                       = $lineStats.center
        component_count              = $components.Count
        endpoint_node_count          = $selectedNodeDegrees.Count
        degree_one_endpoint_count    = $degreeOneCount
        maximum_endpoint_degree      = $maxDegree
        permanent_identifier_count   = $permanentIds.Count
        nhdplus_id_count             = $nhdPlusIds.Count
        anchor_matched_feature_count = $anchoredFeatureIndexes.Count
        anchor_match_counts          = $anchorMatchCounts
        ftype_460_count              = [int]$fTypeCounts[460]
        ftype_558_count              = [int]$fTypeCounts[558]
        geometry_source_description  = $geometrySourceDescription
        source_query_where           = $whereClause
        source_layers                = $sourceLayers
    }
}

$registry = Read-JsonFile $CorridorRegistryPath
if (-not $registry.corridors) {
    throw "Corridor registry has no corridors: $CorridorRegistryPath"
}
$overrides = Read-JsonFile $OverridePath
if (-not $overrides.corridors) {
    throw "Corridor overrides have no corridors: $OverridePath"
}

$definitionsByCorridorId = @{}
foreach ($definition in $overrides.corridors) {
    $definitionCorridorId = [string]$definition.corridor_id
    if ($definitionsByCorridorId.ContainsKey($definitionCorridorId)) {
        throw "Duplicate corridor definition in overrides: $definitionCorridorId"
    }
    $definitionsByCorridorId[$definitionCorridorId] = $definition
}

$corridorsById = @{}
$occurrenceToCorridor = @{}
$corridorParts = @{}
$corridorSourceTiles = @{}
$corridorSourceFeatureCounts = @{}
$anchorPartsByOccurrence = @{}
$sourceBackedStats = @{}

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
        $anchorPartsByOccurrence[$id] = @{}
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
            Add-LineParts -Geometry $feature.geometry -PartsByKey $anchorPartsByOccurrence[$occurrenceId]
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

foreach ($corridor in $registry.corridors) {
    $corridorId = [string]$corridor.corridor_id
    if (-not $definitionsByCorridorId.ContainsKey($corridorId)) {
        throw "Generated registry corridor is missing from overrides: $corridorId"
    }
    $definition = $definitionsByCorridorId[$corridorId]
    if ($definition.PSObject.Properties.Name -notcontains 'source_backed_geometry') { continue }
    if ([string]::IsNullOrWhiteSpace($HydrographyGeoPackagePath)) {
        throw "A hydrography GeoPackage is required by source-backed corridor $corridorId."
    }

    $stats = Build-SourceBackedCorridor `
        -Corridor $corridor `
        -Definition $definition `
        -AnchorPartsByOccurrence $anchorPartsByOccurrence `
        -GeoPackagePath $HydrographyGeoPackagePath `
        -OgrExecutablePath $Ogr2OgrPath
    $sourceBackedStats[$corridorId] = $stats
    $corridorParts[$corridorId] = $stats.parts_by_key
    $corridorSourceTiles[$corridorId].Clear()
    $corridorSourceFeatureCounts[$corridorId] = [int]$stats.source_feature_count

    Set-ObjectProperty -Object $corridor -Name 'bounds' -Value $stats.bounds
    Set-ObjectProperty -Object $corridor -Name 'center' -Value $stats.center
    Set-ObjectProperty -Object $corridor -Name 'segment_count' -Value ([int]$stats.unique_line_part_count)
    Set-ObjectProperty -Object $corridor -Name 'source_feature_count' -Value ([int]$stats.source_feature_count)
    Set-ObjectProperty -Object $corridor -Name 'unique_line_part_count' -Value ([int]$stats.unique_line_part_count)
    Set-ObjectProperty -Object $corridor -Name 'vertex_count' -Value ([int]$stats.vertex_count)
    Set-ObjectProperty -Object $corridor -Name 'source_length_km' -Value ([double]$stats.source_length_km)
    Set-ObjectProperty -Object $corridor -Name 'geometry_source_public' -Value ([string]$stats.geometry_source_description)
}

if ($sourceBackedStats.Count -gt 0) {
    Set-ObjectProperty -Object $registry.metadata -Name 'source_backed_corridor_count' -Value $sourceBackedStats.Count
    Set-ObjectProperty -Object $registry.metadata -Name 'source_backed_hydrography' -Value ([System.IO.Path]::GetFullPath($HydrographyGeoPackagePath))
    Write-JsonFile -Value $registry -Path $CorridorRegistryPath -Depth 30
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
    $isSourceBacked = $sourceBackedStats.ContainsKey($corridorId)
    $corridorBounds = if ($isSourceBacked) { $sourceBackedStats[$corridorId].bounds } else { $corridor.bounds }
    $corridorCenter = if ($isSourceBacked) { $sourceBackedStats[$corridorId].center } else { $corridor.center }
    $geometrySourceDescription = if ($isSourceBacked) {
        [string]$sourceBackedStats[$corridorId].geometry_source_description
    }
    else {
        'Grouped Atlas named-water occurrence geometry'
    }

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
        bounds                = $corridorBounds
        center                = $corridorCenter
        source_tile_count     = $sourceTileCount
        source_feature_count  = $sourceFeatureCount
        unique_line_part_count = $uniqueLinePartCount
        geometry_status_public = 'Aggregate named-water corridor'
        geometry_source_public = $geometrySourceDescription
    }
    if ($isSourceBacked) {
        $stats = $sourceBackedStats[$corridorId]
        $properties.vertex_count = [int]$stats.vertex_count
        $properties.source_length_km = [double]$stats.source_length_km
        $properties.source_component_count = [int]$stats.component_count
        $properties.endpoint_node_count = [int]$stats.endpoint_node_count
        $properties.degree_one_endpoint_count = [int]$stats.degree_one_endpoint_count
        $properties.maximum_endpoint_degree = [int]$stats.maximum_endpoint_degree
        $properties.anchor_matched_feature_count = [int]$stats.anchor_matched_feature_count
        $properties.ftype_460_count = [int]$stats.ftype_460_count
        $properties.ftype_558_count = [int]$stats.ftype_558_count
        $properties.anchor_match_counts = $stats.anchor_match_counts
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
        SourceBacked      = $isSourceBacked
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
