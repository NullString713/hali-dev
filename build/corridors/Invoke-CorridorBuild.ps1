#requires -Version 7.0

[CmdletBinding()]
param(
    [string] $ProcessedInterpretedRoot = 'C:\ct-atlas-data\processed\geojson\interpreted',

    [string] $OutputRoot = 'C:\ct-atlas-data\processed\geojson\interpreted\corridor-pilot-v1',

    [string] $HydrographyGeoPackagePath = 'C:\ct-atlas-data\processed\gpkg\ct_atlas_colorado_hydro_clean.gpkg',

    [string] $Ogr2OgrPath = 'C:\OSGeo4W\bin\ogr2ogr.exe'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$registryOutput = Join-Path $OutputRoot 'colorado_named_water_corridor_registry_v1.json'
$geoJsonOutput = Join-Path $OutputRoot 'colorado_named_water_corridors_v1.geojson'
$tileDirectory = Join-Path $OutputRoot 'colorado_named_water_corridors_v1_tiles'
$tileIndexOutput = Join-Path $OutputRoot 'colorado_named_water_corridors_v1_tile_index.json'

$expectedOutputs = @(
    $registryOutput,
    $geoJsonOutput,
    $tileIndexOutput,
    $tileDirectory
)
$existingOutputs = @($expectedOutputs | Where-Object { Test-Path -LiteralPath $_ })

if ($existingOutputs.Count -gt 0) {
    Write-Host 'Corridor pilot build stopped because expected output already exists:'
    foreach ($existingPath in $existingOutputs) {
        Write-Host "  $([System.IO.Path]::GetFullPath($existingPath))"
    }
    throw 'Choose a new OutputRoot or explicitly remove the old corridor pilot output before rerunning.'
}

& (Join-Path $PSScriptRoot 'Build-CorridorRegistry.ps1') `
    -OccurrenceRegistryPath (Join-Path $ProcessedInterpretedRoot 'colorado_named_water_occurrence_registry_v1.json') `
    -OverridePath (Join-Path $PSScriptRoot 'config\colorado_named_water_corridor_overrides_v1.json') `
    -OutputPath $registryOutput

$occurrenceIndexes = @(
    (Join-Path $ProcessedInterpretedRoot 'colorado_named_water_occurrences_v1_tier1_tile_index.json'),
    (Join-Path $ProcessedInterpretedRoot 'colorado_named_water_occurrences_v1_tier2_tile_index.json'),
    (Join-Path $ProcessedInterpretedRoot 'colorado_named_water_occurrences_v1_tier3_tile_index.json'),
    (Join-Path $ProcessedInterpretedRoot 'colorado_named_water_occurrences_v1_tier4_tile_index.json')
)

& (Join-Path $PSScriptRoot 'Build-CorridorGeoJson.ps1') `
    -CorridorRegistryPath $registryOutput `
    -OccurrenceTileIndexPaths $occurrenceIndexes `
    -OverridePath (Join-Path $PSScriptRoot 'config\colorado_named_water_corridor_overrides_v1.json') `
    -HydrographyGeoPackagePath $HydrographyGeoPackagePath `
    -Ogr2OgrPath $Ogr2OgrPath `
    -OutputPath $geoJsonOutput

& (Join-Path $PSScriptRoot 'Build-CorridorTiles.ps1') `
    -CorridorGeoJsonPath $geoJsonOutput `
    -TileOutputDirectory $tileDirectory `
    -TileIndexOutputPath $tileIndexOutput

Write-Host "Corridor pilot build complete: $OutputRoot"
