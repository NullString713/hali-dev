#requires -Version 7.0

# Dot-sourced source-backed corridor construction helpers.

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

function Assert-SourceBackedCorridorDefinition {
    param(
        [object] $Corridor,
        [object] $Definition
    )

    $corridorId = [string]$Corridor.corridor_id
    $config = $Definition.source_backed_geometry
    if ($null -eq $config -or [int]$config.schema_version -ne 1) {
        throw "Source-backed corridor $corridorId requires schema_version 1."
    }

    foreach ($sectionName in @('identity', 'source', 'anchors', 'selection', 'boundary_policy', 'validation', 'output')) {
        if ($config.PSObject.Properties.Name -notcontains $sectionName -or $null -eq $config.$sectionName) {
            throw "Source-backed corridor $corridorId is missing required '$sectionName' configuration."
        }
    }

    $gnisId = [string]$config.identity.gnis_id
    $normalizedName = Normalize-WaterName $config.identity.normalized_name
    if ([string]::IsNullOrWhiteSpace($gnisId) -or [string]::IsNullOrWhiteSpace($normalizedName)) {
        throw "Source-backed corridor $corridorId requires a GNIS ID and normalized source name."
    }

    [string[]]$sourceLayers = @($config.source.layers | ForEach-Object { [string]$_ })
    $supportedSourceLayers = @('flowlines_colorado_streamriver', 'flowlines_colorado_connectors')
    if ($sourceLayers.Count -eq 0 -or @($sourceLayers | Where-Object { $supportedSourceLayers -notcontains $_ }).Count -gt 0) {
        throw "Source-backed corridor $corridorId contains an empty or unsupported source layer list: $($sourceLayers -join ', ')"
    }
    if ($config.source.require_in_network -isnot [bool]) {
        throw "Source-backed corridor $corridorId source.require_in_network must be a boolean."
    }
    if (-not [bool]$config.source.require_in_network) {
        throw "Source-backed corridor $corridorId currently requires InNetwork source features."
    }

    [int[]]$allowedFTypes = @()
    foreach ($fType in @($config.source.allowed_ftypes)) {
        if ($fType -isnot [int] -and $fType -isnot [long]) {
            throw "Source-backed corridor $corridorId contains a non-integer FType: '$fType'."
        }
        if ([int]$fType -le 0) {
            throw "Source-backed corridor $corridorId contains an invalid FType: '$fType'."
        }
        $allowedFTypes += [int]$fType
    }
    $allowedFTypes = @($allowedFTypes | Sort-Object -Unique)
    if ($allowedFTypes.Count -eq 0) {
        throw "Source-backed corridor $corridorId requires at least one allowed FType."
    }

    if ([string]$config.anchors.mode -ne 'occurrence_component') {
        throw "Source-backed corridor $corridorId has unsupported anchors.mode '$($config.anchors.mode)'."
    }
    if ($config.anchors.require_every_anchor_match -isnot [bool] -or -not [bool]$config.anchors.require_every_anchor_match) {
        throw "Source-backed corridor $corridorId anchors.require_every_anchor_match must be true."
    }
    [string[]]$anchorIds = @($config.anchors.occurrence_ids | ForEach-Object { [string]$_ })
    if ($anchorIds.Count -eq 0 -or [double]$config.anchors.maximum_tolerance_meters -le 0.0) {
        throw "Source-backed corridor $corridorId requires occurrence anchors and a positive maximum tolerance."
    }
    $configuredAnchorIds = @($anchorIds | Sort-Object -Unique)
    $memberOccurrenceIds = @($Corridor.member_occurrence_ids | ForEach-Object { [string]$_ } | Sort-Object -Unique)
    if (($configuredAnchorIds -join "`n") -ne ($memberOccurrenceIds -join "`n")) {
        throw "Source-backed corridor $corridorId anchor occurrence IDs must exactly match its registry members."
    }

    if ([string]$config.selection.component_policy -ne 'single_anchor_touched_component') {
        throw "Source-backed corridor $corridorId has unsupported selection.component_policy '$($config.selection.component_policy)'."
    }
    if ($config.selection.require_all_candidates_selected -isnot [bool]) {
        throw "Source-backed corridor $corridorId selection.require_all_candidates_selected must be a boolean."
    }
    if ([string]$config.boundary_policy.extent -ne 'source_dataset' -or
        [string]$config.boundary_policy.terminal_policy -ne 'topology_only') {
        throw "Source-backed corridor $corridorId supports only source_dataset/topology_only boundary policy."
    }

    $requiredValidationFields = @(
        'candidate_feature_count', 'selected_feature_count', 'candidate_component_count',
        'selected_component_count', 'endpoint_node_count', 'degree_one_node_count',
        'maximum_node_degree', 'loop_count', 'branch_node_count',
        'unique_permanent_identifier_count', 'unique_nhdplus_id_count', 'line_part_count',
        'vertex_count', 'source_length_km', 'source_length_tolerance_km',
        'feature_counts_by_ftype'
    )
    foreach ($fieldName in $requiredValidationFields) {
        if ($config.validation.PSObject.Properties.Name -notcontains $fieldName -or $null -eq $config.validation.$fieldName) {
            throw "Source-backed corridor $corridorId is missing validation.$fieldName."
        }
    }
    foreach ($fieldName in $requiredValidationFields | Where-Object { $_ -notin @('source_length_km', 'source_length_tolerance_km', 'feature_counts_by_ftype') }) {
        if ([int64]$config.validation.$fieldName -lt 0) {
            throw "Source-backed corridor $corridorId validation.$fieldName must be non-negative."
        }
    }
    if ([double]$config.validation.source_length_km -le 0.0 -or [double]$config.validation.source_length_tolerance_km -lt 0.0) {
        throw "Source-backed corridor $corridorId requires a positive source length and non-negative tolerance."
    }
    foreach ($fTypeName in $config.validation.feature_counts_by_ftype.PSObject.Properties.Name) {
        [int]$parsedFType = 0
        if (-not [int]::TryParse($fTypeName, [ref]$parsedFType) -or $allowedFTypes -notcontains $parsedFType) {
            throw "Source-backed corridor $corridorId has an invalid feature_counts_by_ftype key '$fTypeName'."
        }
    }
    foreach ($allowedFType in $allowedFTypes) {
        if ($config.validation.feature_counts_by_ftype.PSObject.Properties.Name -notcontains [string]$allowedFType) {
            throw "Source-backed corridor $corridorId is missing an expected count for FType $allowedFType."
        }
    }
    if ([string]::IsNullOrWhiteSpace([string]$config.output.geometry_source_description)) {
        throw "Source-backed corridor $corridorId requires output.geometry_source_description."
    }

    return [pscustomobject]@{
        gnis_id                         = $gnisId
        normalized_name                 = $normalizedName
        source_layers                   = $sourceLayers
        allowed_ftypes                  = $allowedFTypes
        require_in_network              = [bool]$config.source.require_in_network
        anchor_occurrence_ids           = $anchorIds
        require_every_anchor_match      = [bool]$config.anchors.require_every_anchor_match
        maximum_anchor_tolerance_meters = [double]$config.anchors.maximum_tolerance_meters
        require_all_candidates_selected = [bool]$config.selection.require_all_candidates_selected
        validation                      = $config.validation
        geometry_source_description     = [string]$config.output.geometry_source_description
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
    $policy = Assert-SourceBackedCorridorDefinition -Corridor $Corridor -Definition $Definition
    $gnisId = $policy.gnis_id
    $normalizedSourceName = $policy.normalized_name
    [int[]]$allowedFTypes = $policy.allowed_ftypes
    $requireInNetwork = $policy.require_in_network
    [string[]]$sourceLayers = $policy.source_layers
    [string[]]$anchorOccurrenceIds = $policy.anchor_occurrence_ids
    $anchorToleranceMeters = $policy.maximum_anchor_tolerance_meters
    $expected = $policy.validation
    $expectedFeatureCount = [int]$expected.candidate_feature_count
    $expectedSelectedFeatureCount = [int]$expected.selected_feature_count
    $geometrySourceDescription = $policy.geometry_source_description

    $escapedGnisId = $gnisId.Replace("'", "''")
    $escapedName = $normalizedSourceName.Replace("'", "''")
    $allowedFTypeSql = $allowedFTypes -join ', '
    $inNetworkSql = if ($requireInNetwork) { ' AND InNetwork = 1' } else { '' }
    $whereClause = "GNIS_ID = '$escapedGnisId' AND lower(trim(GNIS_Name)) = '$escapedName' AND FType IN ($allowedFTypeSql)$inNetworkSql"
    $selectFields = 'Shape, Permanent_Identifier, GNIS_ID, GNIS_Name, LengthKM, ReachCode, FlowDir, FType, FCode, InNetwork, NHDPlusID, VPUID'
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
        throw "Source-backed corridor $corridorId source feature count changed: expected $expectedFeatureCount, found $($candidateFeatures.Count)."
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
        throw "Source records for $corridorId were not keyed one-to-one by Permanent_Identifier."
    }

    if (@($candidateFeatures | Where-Object {
        (Normalize-WaterName $_.properties.GNIS_Name) -match '^(north|south) fork '
    }).Count -ne 0) {
        throw "Fork geometry was admitted to the source candidate set for $corridorId."
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
    $anchorMinimumDistances = [ordered]@{}
    $anchoredFeatureIndexes = [System.Collections.Generic.HashSet[int]]::new()
    foreach ($occurrenceIdValue in $anchorOccurrenceIds) {
        $occurrenceId = [string]$occurrenceIdValue
        if (-not $AnchorPartsByOccurrence.ContainsKey($occurrenceId)) {
            throw "No occurrence geometry was loaded for required source-backed anchor: $occurrenceId"
        }

        $anchorPoints = [System.Collections.Generic.List[object]]::new()
        foreach ($anchorPart in $AnchorPartsByOccurrence[$occurrenceId].Values) {
            foreach ($anchorPoint in [object[]]$anchorPart) { $anchorPoints.Add($anchorPoint) }
        }

        $matches = [System.Collections.Generic.HashSet[int]]::new()
        $minimumAnchorDistance = [double]::PositiveInfinity
        for ($featureIndex = 0; $featureIndex -lt $sourceRecords.Count; $featureIndex++) {
            $record = $sourceRecords[$featureIndex]
            foreach ($anchorPoint in $anchorPoints) {
                $distanceMeters = Get-PointToLinePartDistanceMeters `
                    -Point $anchorPoint `
                    -LinePart ([object[]]$record.coordinates)
                if ($distanceMeters -lt $minimumAnchorDistance) {
                    $minimumAnchorDistance = $distanceMeters
                }
                if ($distanceMeters -le $anchorToleranceMeters) {
                    $null = $matches.Add($featureIndex)
                }
            }
        }

        if ($policy.require_every_anchor_match -and $matches.Count -eq 0) {
            throw "Approved occurrence anchor did not touch an allowed exact-identity source line within $anchorToleranceMeters meters: $occurrenceId (nearest $minimumAnchorDistance meters)"
        }
        foreach ($match in $matches) { $null = $anchoredFeatureIndexes.Add($match) }
        $anchorMatchCounts[$occurrenceId] = $matches.Count
        $anchorMinimumDistances[$occurrenceId] = [Math]::Round($minimumAnchorDistance, 6)
    }

    if ($policy.require_every_anchor_match -and $anchoredFeatureIndexes.Count -eq 0) {
        throw "No source features were touched by the approved anchors for $corridorId."
    }

    $anchoredComponentIds = @($anchoredFeatureIndexes | ForEach-Object { $componentByFeature[$_] } | Sort-Object -Unique)
    if ($anchoredComponentIds.Count -ne 1) {
        throw "Source-backed corridor $corridorId anchors touch $($anchoredComponentIds.Count) candidate components; exactly one is required."
    }
    $selectedIndexes = $components[$anchoredComponentIds[0]]
    if ($selectedIndexes.Count -ne $expectedSelectedFeatureCount) {
        throw "Anchored component for $corridorId selected $($selectedIndexes.Count) features; expected $expectedSelectedFeatureCount."
    }
    if ($policy.require_all_candidates_selected -and $selectedIndexes.Count -ne $candidateFeatures.Count) {
        throw "Source-backed corridor $corridorId requires all candidates, but selected $($selectedIndexes.Count) of $($candidateFeatures.Count)."
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
    $branchNodeCount = @($selectedNodeDegrees.Values | Where-Object { $_ -gt 2 }).Count
    $loopCount = @($selectedIndexes | Where-Object {
        $sourceRecords[$_].start_key -eq $sourceRecords[$_].end_key
    }).Count
    if ($components.Count -ne [int]$expected.candidate_component_count) {
        throw "Source-backed corridor $corridorId expected $($expected.candidate_component_count) candidate components, found $($components.Count)."
    }
    if ($anchoredComponentIds.Count -ne [int]$expected.selected_component_count) {
        throw "Source-backed corridor $corridorId expected $($expected.selected_component_count) selected components, found $($anchoredComponentIds.Count)."
    }
    if ($selectedNodeDegrees.Count -ne [int]$expected.endpoint_node_count) {
        throw "Source-backed corridor $corridorId expected $($expected.endpoint_node_count) endpoint nodes, found $($selectedNodeDegrees.Count)."
    }
    if ($degreeOneCount -ne [int]$expected.degree_one_node_count) {
        throw "Source-backed corridor $corridorId expected $($expected.degree_one_node_count) degree-1 nodes, found $degreeOneCount."
    }
    if ($maxDegree -gt [int]$expected.maximum_node_degree) {
        throw "Source-backed corridor $corridorId permits maximum endpoint degree $($expected.maximum_node_degree), found $maxDegree."
    }
    if ($loopCount -ne [int]$expected.loop_count -or $branchNodeCount -ne [int]$expected.branch_node_count) {
        throw "Source-backed corridor $corridorId topology changed: loops $loopCount, branch nodes $branchNodeCount."
    }
    if ($permanentIds.Count -ne [int]$expected.unique_permanent_identifier_count -or $nhdPlusIds.Count -ne [int]$expected.unique_nhdplus_id_count) {
        throw "Source-backed corridor $corridorId source identifier counts changed."
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
    if ($partsByKey.Count -ne [int]$expected.line_part_count) {
        throw "Source-backed corridor $corridorId expected $($expected.line_part_count) line parts, found $($partsByKey.Count)."
    }
    foreach ($outputPartKey in $partsByKey.Keys) {
        if (-not $sourcePartKeys.Contains($outputPartKey)) {
            throw 'Output contains a line that was not copied from selected source geometry.'
        }
    }

    [object[]]$selectedParts = @($partsByKey.Values)
    $lineStats = Get-LineCollectionStats -LineParts $selectedParts -SourceLengthKm $sourceLengthKm
    if ($lineStats.vertex_count -ne [int]$expected.vertex_count) {
        throw "Source-backed corridor $corridorId expected $($expected.vertex_count) vertices, found $($lineStats.vertex_count)."
    }
    if ([Math]::Abs($sourceLengthKm - [double]$expected.source_length_km) -gt [double]$expected.source_length_tolerance_km) {
        throw "Source-backed corridor $corridorId source length changed: expected $($expected.source_length_km) km, found $sourceLengthKm km."
    }
    foreach ($fType in $allowedFTypes) {
        $actualCount = if ($fTypeCounts.ContainsKey($fType)) { [int]$fTypeCounts[$fType] } else { 0 }
        $expectedCount = [int]$expected.feature_counts_by_ftype.PSObject.Properties[[string]$fType].Value
        if ($actualCount -ne $expectedCount) {
            throw "Source-backed corridor $corridorId FType $fType count changed: expected $expectedCount, found $actualCount."
        }
    }

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
        loop_count                   = $loopCount
        branch_node_count            = $branchNodeCount
        permanent_identifier_count   = $permanentIds.Count
        nhdplus_id_count             = $nhdPlusIds.Count
        anchor_matched_feature_count = $anchoredFeatureIndexes.Count
        anchor_match_counts          = $anchorMatchCounts
        anchor_minimum_distances_m   = $anchorMinimumDistances
        maximum_anchor_tolerance_m   = $anchorToleranceMeters
        feature_counts_by_ftype      = $fTypeCounts
        # Preserve deployed/runtime-compatible public fields during this refactor.
        ftype_460_count              = if ($fTypeCounts.ContainsKey(460)) { [int]$fTypeCounts[460] } else { 0 }
        ftype_558_count              = if ($fTypeCounts.ContainsKey(558)) { [int]$fTypeCounts[558] } else { 0 }
        geometry_source_description  = $geometrySourceDescription
        source_query_where           = $whereClause
        source_layers                = $sourceLayers
    }
}

