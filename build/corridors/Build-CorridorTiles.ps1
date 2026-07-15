#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $CorridorGeoJsonPath,

    [Parameter(Mandatory = $true)]
    [string] $TileOutputDirectory,

    [Parameter(Mandatory = $true)]
    [string] $TileIndexOutputPath,

    [string] $WebTilePathPrefix = './data/geojson/interpreted/colorado_named_water_corridors_v1_tiles',

    [double] $TileSize = 0.25,

    [int] $MinZoom = 8,

    [int] $MaxZoom = 18
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Read-JsonFile {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "GeoJSON input does not exist: $Path"
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

function Test-PointsEqual {
    param([object] $A, [object] $B)
    return [Math]::Abs([double]$A[0] - [double]$B[0]) -lt 1e-10 -and
        [Math]::Abs([double]$A[1] - [double]$B[1]) -lt 1e-10
}

function Clip-LineSegment {
    param(
        [object] $Start,
        [object] $End,
        [double] $West,
        [double] $South,
        [double] $East,
        [double] $North
    )

    $x0 = [double]$Start[0]
    $y0 = [double]$Start[1]
    $x1 = [double]$End[0]
    $y1 = [double]$End[1]
    $dx = $x1 - $x0
    $dy = $y1 - $y0
    $p = @(-$dx, $dx, -$dy, $dy)
    $q = @(
        ($x0 - $West),
        ($East - $x0),
        ($y0 - $South),
        ($North - $y0)
    )
    $u1 = 0.0
    $u2 = 1.0

    for ($i = 0; $i -lt 4; $i++) {
        if ([Math]::Abs($p[$i]) -lt 1e-14) {
            if ($q[$i] -lt 0) { return $null }
            continue
        }

        $t = $q[$i] / $p[$i]
        if ($p[$i] -lt 0) {
            if ($t -gt $u2) { return $null }
            if ($t -gt $u1) { $u1 = $t }
        }
        else {
            if ($t -lt $u1) { return $null }
            if ($t -lt $u2) { $u2 = $t }
        }
    }

    $a = @([Math]::Round($x0 + $u1 * $dx, 10), [Math]::Round($y0 + $u1 * $dy, 10))
    $b = @([Math]::Round($x0 + $u2 * $dx, 10), [Math]::Round($y0 + $u2 * $dy, 10))
    if (Test-PointsEqual $a $b) { return $null }
    return ,@($a, $b)
}

function Clip-LineString {
    param(
        [object[]] $Coordinates,
        [double] $West,
        [double] $South,
        [double] $East,
        [double] $North
    )

    $parts = [System.Collections.Generic.List[object]]::new()
    $current = [System.Collections.Generic.List[object]]::new()

    for ($i = 1; $i -lt $Coordinates.Count; $i++) {
        $clipped = Clip-LineSegment `
            -Start ($Coordinates[$i - 1]) `
            -End ($Coordinates[$i]) `
            -West $West `
            -South $South `
            -East $East `
            -North $North
        if ($null -eq $clipped) {
            if ($current.Count -ge 2) { $parts.Add($current.ToArray()) }
            $current = [System.Collections.Generic.List[object]]::new()
            continue
        }

        $a = $clipped[0]
        $b = $clipped[1]
        if ($current.Count -eq 0) {
            $current.Add($a)
            $current.Add($b)
        }
        elseif (Test-PointsEqual $current[$current.Count - 1] $a) {
            if (-not (Test-PointsEqual $current[$current.Count - 1] $b)) {
                $current.Add($b)
            }
        }
        else {
            if ($current.Count -ge 2) { $parts.Add($current.ToArray()) }
            $current = [System.Collections.Generic.List[object]]::new()
            $current.Add($a)
            $current.Add($b)
        }
    }

    if ($current.Count -ge 2) { $parts.Add($current.ToArray()) }
    return @($parts)
}

function Get-LineBounds {
    param([object] $Coordinates)

    if ($null -eq $Coordinates -or -not ($Coordinates -is [System.Array])) {
        throw 'Get-LineBounds expected a line part containing an array of coordinate pairs.'
    }

    # An explicit cast preserves one array level when PowerShell would otherwise
    # unwrap a single-item or nested array during parameter binding.
    $points = [object[]]$Coordinates
    if ($points.Count -lt 2) {
        throw "Get-LineBounds expected at least two coordinate pairs, found $($points.Count)."
    }

    foreach ($point in $points) {
        if (-not ($point -is [System.Array]) -or $point.Count -lt 2) {
            $actualType = if ($null -eq $point) { '<null>' } else { $point.GetType().FullName }
            throw "Get-LineBounds expected a line-part structure, but found '$actualType' where a coordinate pair was required."
        }
    }

    $xs = @($points | ForEach-Object { [double]$_[0] })
    $ys = @($points | ForEach-Object { [double]$_[1] })
    return [ordered]@{
        west  = [double](($xs | Measure-Object -Minimum).Minimum)
        south = [double](($ys | Measure-Object -Minimum).Minimum)
        east  = [double](($xs | Measure-Object -Maximum).Maximum)
        north = [double](($ys | Measure-Object -Maximum).Maximum)
    }
}

function Get-MaxTileIndex {
    param([double] $Minimum, [double] $Maximum, [double] $Size)
    if ([Math]::Abs($Maximum - $Minimum) -lt 1e-12) {
        return [int][Math]::Floor($Maximum / $Size)
    }
    $scaled = $Maximum / $Size
    if ([Math]::Abs($scaled - [Math]::Round($scaled)) -lt 1e-10) {
        return [int][Math]::Round($scaled) - 1
    }
    return [int][Math]::Floor($scaled)
}

if ($TileSize -le 0) { throw 'TileSize must be greater than zero.' }

$source = Read-JsonFile $CorridorGeoJsonPath
if ($source.type -ne 'FeatureCollection') {
    throw "Expected a GeoJSON FeatureCollection: $CorridorGeoJsonPath"
}

$tileFeatures = @{}
foreach ($feature in $source.features) {
    if ($feature.geometry.type -ne 'MultiLineString') {
        throw "Corridor $($feature.properties.corridor_id) must be a MultiLineString."
    }

    foreach ($line in $feature.geometry.coordinates) {
        $coordinates = [object[]]$line
        $bounds = Get-LineBounds $coordinates
        $minX = [int][Math]::Floor($bounds.west / $TileSize)
        $maxX = Get-MaxTileIndex $bounds.west $bounds.east $TileSize
        $minY = [int][Math]::Floor($bounds.south / $TileSize)
        $maxY = Get-MaxTileIndex $bounds.south $bounds.north $TileSize

        for ($x = $minX; $x -le $maxX; $x++) {
            for ($y = $minY; $y -le $maxY; $y++) {
                $west = $x * $TileSize
                $south = $y * $TileSize
                $east = $west + $TileSize
                $north = $south + $TileSize
                $clippedParts = @(Clip-LineString $coordinates $west $south $east $north)
                if ($clippedParts.Count -eq 0) { continue }

                $tileKey = "$x,$y"
                if (-not $tileFeatures.ContainsKey($tileKey)) {
                    $tileFeatures[$tileKey] = @{}
                }
                $corridorId = [string]$feature.properties.corridor_id
                if (-not $tileFeatures[$tileKey].ContainsKey($corridorId)) {
                    $tileFeatures[$tileKey][$corridorId] = [ordered]@{
                        properties = $feature.properties
                        parts      = [System.Collections.Generic.List[object]]::new()
                    }
                }
                foreach ($part in $clippedParts) {
                    $tileFeatures[$tileKey][$corridorId].parts.Add($part)
                }
            }
        }
    }
}

[System.IO.Directory]::CreateDirectory($TileOutputDirectory) | Out-Null
$index = [System.Collections.Generic.List[object]]::new()
$seenCorridors = [System.Collections.Generic.HashSet[string]]::new()

foreach ($tileKey in @($tileFeatures.Keys | Sort-Object { [int]($_ -split ',')[0] }, { [int]($_ -split ',')[1] })) {
    $xy = $tileKey -split ','
    $x = [int]$xy[0]
    $y = [int]$xy[1]
    $features = [System.Collections.Generic.List[object]]::new()

    foreach ($corridorId in @($tileFeatures[$tileKey].Keys | Sort-Object)) {
        $record = $tileFeatures[$tileKey][$corridorId]
        $features.Add([ordered]@{
            type       = 'Feature'
            properties = $record.properties
            geometry   = [ordered]@{
                type        = 'MultiLineString'
                coordinates = @($record.parts)
            }
        })
        $null = $seenCorridors.Add($corridorId)
    }

    if ($features.Count -eq 0) { continue }
    $fileName = "tile_named_water_corridors_v1_x${x}_y${y}.geojson"
    $tilePath = Join-Path $TileOutputDirectory $fileName
    Write-JsonFile -Value ([ordered]@{ type = 'FeatureCollection'; features = @($features) }) -Path $tilePath

    $west = $x * $TileSize
    $south = $y * $TileSize
    $index.Add([ordered]@{
        key        = "colorado:named-water-corridors:v1:x${x}:y${y}"
        label      = "Colorado named-water corridors v1 tile $x,$y"
        path       = "$($WebTilePathPrefix.TrimEnd('/'))/$fileName"
        scope      = 'colorado'
        group      = 'featured'
        sourceType = 'interpreted'
        type       = 'colorado-named-water-corridor-v1-tile'
        minZoom    = $MinZoom
        maxZoom    = $MaxZoom
        pane       = 'featuredWaters'
        order      = 59
        bounds     = [ordered]@{
            west  = $west
            south = $south
            east  = $west + $TileSize
            north = $south + $TileSize
        }
    })
}

$expectedCorridors = @($source.features | ForEach-Object { [string]$_.properties.corridor_id } | Sort-Object -Unique)
$missingCorridors = @($expectedCorridors | Where-Object { -not $seenCorridors.Contains($_) })
if ($missingCorridors.Count -gt 0) {
    throw "Corridors produced no tile geometry: $($missingCorridors -join ', ')"
}

Write-JsonFile -Value @($index) -Path $TileIndexOutputPath -Depth 20
Write-Host "Wrote $($index.Count) corridor tiles and tile index $TileIndexOutputPath"
