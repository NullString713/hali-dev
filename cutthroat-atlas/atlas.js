const speciesColors = {
  greenback: { label: 'Greenback CT', color: '#22c55e' },
  coloradoRiver: { label: 'Colorado River CT', color: '#e85d3f' },
  greenRiverBlue: { label: 'Green River / Blue-lineage CT', color: '#2563eb' },
  sanJuan: { label: 'San Juan CT', color: '#0f766e' },
  rioGrande: { label: 'Rio Grande CT', color: '#a855f7' },
  yellowfin: { label: 'Yellowfin CT', color: '#facc15' },
  bonneville: { label: 'Bonneville CT', color: '#d97706' },
  lahontan: { label: 'Lahontan CT', color: '#60a5fa' },
  yellowstone: { label: 'Yellowstone CT', color: '#a3e635' },
  westslope: { label: 'Westslope CT', color: '#fb7185' },
  paiute: { label: 'Paiute CT', color: '#fb923c' },
  coastal: { label: 'Coastal CT', color: '#06b6d4' },

  gila: { label: 'Gila Trout', color: '#84cc16' },
  apache: { label: 'Apache Trout', color: '#fde047' },
  bull: { label: 'Bull Trout', color: '#14b8a6' },

  brown: { label: 'Brown Trout', color: '#a16207' },
  rainbow: { label: 'Rainbow Trout', color: '#ec4899' },
  brook: { label: 'Brook Trout', color: '#ef4444' },
  introduced: { label: 'Introduced Trout / Mixed', color: '#94a3b8' },

  unknown: { label: 'Unknown / Generalized', color: '#38bdf8' },

  recoveryHigh: { label: 'Recovery / Sensitive', color: '#f97316' },
  recoveryStable: { label: 'Stable / Managed', color: '#10b981' },
  recoveryWatch: { label: 'Watch / Review Needed', color: '#eab308' },
  recoveryLow: { label: 'Extirpated / Uncertain', color: '#a3a3a3' }
};

const legendByMode = {
  historic: [
    'greenback',
    'coloradoRiver',
    'greenRiverBlue',
    'sanJuan',
    'rioGrande',
    'yellowfin',
    'bonneville',
    'lahontan',
    'yellowstone',
    'westslope',
    'paiute',
    'coastal',
    'gila',
    'apache',
    'bull',
    'unknown'
  ],
  current: [
    'greenback',
    'coloradoRiver',
    'greenRiverBlue',
    'sanJuan',
    'rioGrande',
    'yellowfin',
    'bonneville',
    'lahontan',
    'yellowstone',
    'westslope',
    'paiute',
    'coastal',
    'gila',
    'apache',
    'bull',
    'brown',
    'rainbow',
    'brook',
    'introduced',
    'unknown'
  ],
  recovery: [
    'recoveryHigh',
    'recoveryStable',
    'recoveryWatch',
    'recoveryLow'
  ]
};

const modes = [
  {
    key: 'historic',
    description: 'Showing the species most likely associated with each stream historically.'
  },
  {
    key: 'current',
    description: 'Showing simplified current likely trout presence for the prototype.'
  },
  {
    key: 'recovery',
    description: 'Showing generalized conservation and recovery status.'
  }
];

const DEFAULT_SCOPE = 'colorado';
const DETAIL_PATCH_INDEX_PATH =
  './data/geojson/interpreted/detail_patch_index_v1.json';

const NATURAL_STREAM_TILE_INDEX_PATH =
  './data/geojson/interpreted/colorado_natural_stream_detail_tile_index_v1.json';

const watershedViews = {
  colorado: [
    [36.99, -109.06],
    [41.01, -102.04]
  ],
  poudre: [
    [40.42, -106.20],
    [41.08, -105.10]
  ],
  bigThompson: [
    [40.22, -105.85],
    [40.70, -104.95]
  ],
  southPlatte: [
    [39.45, -105.90],
    [40.30, -104.55]
  ],
  headwaters: [
    [38.55, -106.20],
    [39.55, -104.75]
  ]
};

/*
  LOD model v0

  Goal:
  - Zoomed out: no dense stream spaghetti.
  - Zoomed in: load stream context and clickable waters.
  - Zoom back out: remove dense layers and drop references.

  Current Colorado-only breakpoints:
  - HUC8 lineage polygons: zoom 5+
  - Lakes/waterbodies: zoom 6+
  - Stream polygons: zoom 8+
  - 1km lineage stream context: zoom 8+
  - Curated/clickable prototype waters: zoom 9+
  - Full NHD reference named streams: zoom 10+
*/

const layerCatalog = [
  {
    key: 'colorado:lineage:huc8-polygons',
    scope: 'colorado',
    group: 'lineage',
    path: './data/geojson/interpreted/colorado_cutthroat_huc8_lineage_v1.geojson',
    type: 'colorado-cutthroat-huc8-lineage',
    sourceType: 'lineage-polygons',
    label: 'Colorado cutthroat HUC8 lineage context — prototype',
    minZoom: 5,
    maxZoom: 18,
    pane: 'lineagePolygons',
    order: 20
  },
  {
    key: 'colorado:lakes:waterbodies',
    scope: 'colorado',
    group: 'lakes',
    path: './data/geojson/nhd/colorado_v0_web/waterbodies_colorado_web_v0.geojson',
    type: 'nhd-colorado-waterbodies',
    sourceType: 'lakes',
    label: 'USGS NHD waterbodies — Colorado lakes and reservoirs',
    minZoom: 6,
    maxZoom: 18,
    pane: 'referenceHydro',
    order: 30,
    style: {
      color: '#38bdf8',
      weight: 0.8,
      opacity: 0.75,
      fillColor: '#38bdf8',
      fillOpacity: 0.22
    }
  },
  {
    key: 'colorado:lakes:stream-polygons',
    scope: 'colorado',
    group: 'lakes',
    path: './data/geojson/nhd/colorado_v0_web/waterareas_stream_polygons_colorado_web_v0.geojson',
    type: 'nhd-colorado-stream-polygons',
    sourceType: 'lakes',
    label: 'USGS NHD stream polygons — Colorado',
    minZoom: 8,
    maxZoom: 18,
    pane: 'referenceHydro',
    order: 35,
    style: {
      color: '#38bdf8',
      weight: 0.6,
      opacity: 0.55,
      fillColor: '#38bdf8',
      fillOpacity: 0.18
    }
  },
   {
    key: 'colorado:lineage:stream-context-1km',
    scope: 'colorado',
    group: 'lineage',
    path: './data/geojson/interpreted/colorado_cutthroat_huc8_stream_context_named_web_1km_v1.geojson',
    type: 'colorado-cutthroat-huc8-stream-context',
    sourceType: 'lineage-stream-context',
    label: 'Colorado cutthroat HUC8 stream context — 1 km prototype',
    minZoom: 8,
    maxZoom: 9,
    pane: 'lineageStreams',
    order: 45
  },
  {
    key: 'colorado:lineage:stream-context-05km',
    scope: 'colorado',
    group: 'lineage',
    path: './data/geojson/interpreted/colorado_cutthroat_huc8_stream_context_named_web_05km_v1.geojson',
    type: 'colorado-cutthroat-huc8-stream-context',
    sourceType: 'lineage-stream-context',
    label: 'Colorado cutthroat HUC8 stream context — 0.5 km prototype',
    minZoom: 10,
    maxZoom: 12.99,
    pane: 'lineageStreams',
    order: 46
  },
  {
    key: 'colorado:featured:prototype-waters',
    scope: 'colorado',
    group: 'featured',
    path: './data/geojson/interpreted/colorado_curated_named_waters_v1.geojson',
    type: 'colorado-cutthroat-featured',
    sourceType: 'interpreted',
    label: 'Colorado curated named waters — v1',
    minZoom: 9,
    maxZoom: 18,
    pane: 'featuredWaters',
    order: 60
  },
  {
    key: 'colorado:nhd:named-streams',
    scope: 'colorado',
    group: 'nhd',
    path: './data/geojson/nhd/colorado_v0_web/streams_colorado_web_v1_upload_min.geojson',
    type: 'nhd-colorado-streams',
    sourceType: 'nhd',
    label: 'USGS NHD named streams — Colorado',
    minZoom: 10,
    maxZoom: 18,
    pane: 'referenceHydro',
    order: 70,
    style: {
      color: '#60a5fa',
      weight: 1.1,
      opacity: 0.42
    }
  }

  /*
  Later optional layer:
  {
    key: 'colorado:human-altered-hydrology',
    scope: 'colorado',
    group: 'nhd',
    path: './data/geojson/nhd/colorado_v0_web/human_altered_hydrology_colorado_web_v0.geojson',
    type: 'nhd-colorado-human-altered-hydrology',
    sourceType: 'nhd-human',
    label: 'USGS NHD human-altered hydrology — Colorado canals, ditches, pipelines',
    minZoom: 9,
    maxZoom: 18,
    pane: 'referenceHydro',
    order: 80,
    style: {
      color: '#f59e0b',
      weight: 1,
      opacity: 0.55,
      dashArray: '4 4'
    }
  }
  */
];

let map = null;
let featuredWaters = [];
let detailPatchCatalog = [];
let selectedStream = null;
let currentModeIndex = 0;
let activeDesiredCount = 0;

const activeLayers = new Map();
const loadingLayers = new Map();

const layerVisibility = {
  lakes: true,
  nhd: true,
  lineage: true,
  featured: true
};

const mapElement = document.getElementById('map');

if (mapElement && window.L) {
  initAtlasMap();
}

initDeepTimeStory();

function initAtlasMap() {
  map = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: true,
    preferCanvas: true
  }).setView([39.0, -105.55], 7);
  
  if (map.attributionControl) {
    map.attributionControl.setPrefix(false);
  }
  createMapPanes();
  addBaseTiles();
  hydrateLayerVisibilityFromControls();

  renderLegend();
  renderMode();
  updateDataLoadStatus();

  Promise.allSettled([
    loadFeaturedWatersIndex(),
    loadDetailPatchIndex()
  ]).finally(async () => {
    if (DEFAULT_SCOPE === 'colorado') {
      map.fitBounds(watershedViews.colorado, {
        padding: [24, 24]
      });
    }

    await updateActiveLayers();
  });

  map.on(
    'moveend zoomend',
    debounce(() => {
      updateActiveLayers();
    }, 150)
  );

  const slider = document.getElementById('mode-slider');

  if (slider) {
    slider.addEventListener('input', event => {
      currentModeIndex = Number(event.target.value);
      renderMode();
      renderLegend();
      refreshActiveLayerStyles();

      if (selectedStream) {
        renderStreamCard(selectedStream);
      }
    });
  }

  document.querySelectorAll('[data-layer-toggle]').forEach(toggle => {
    toggle.addEventListener('change', event => {
      const layerGroup = event.target.dataset.layerToggle;

      layerVisibility[layerGroup] = event.target.checked;
      updateActiveLayers();
    });
  });

  document.querySelectorAll('[data-view-jump]').forEach(button => {
    button.addEventListener('click', async event => {
      const viewKey = event.currentTarget.dataset.viewJump;
      const bounds = watershedViews[viewKey];

      if (!bounds) return;

      map.fitBounds(bounds, {
        padding: [40, 40]
      });

      await updateActiveLayers();
    });
  });
}

async function loadFeaturedWatersIndex() {
  try {
    const response = await fetch('./data/waters/index.json');

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for data/waters/index.json`);
    }

    featuredWaters = await response.json();
  } catch (error) {
    console.error('Could not load featured waters:', error);
    featuredWaters = [];
  }
}

async function loadDetailPatchIndex() {
  const indexPaths = [
    DETAIL_PATCH_INDEX_PATH,
    NATURAL_STREAM_TILE_INDEX_PATH
  ];

  const patches = [];

  for (const indexPath of indexPaths) {
    try {
      const response = await fetch(indexPath);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${indexPath}`);
      }

      const indexPatches = await response.json();

      if (!Array.isArray(indexPatches)) {
        console.warn(`Detail patch index was not an array: ${indexPath}`);
        continue;
      }

      patches.push(...indexPatches);
    } catch (error) {
      console.error(`Could not load detail patch index: ${indexPath}`, error);
    }
  }

  detailPatchCatalog = patches.map((patch, index) => normalizeDetailPatchDef(patch, index));
}

function normalizeDetailPatchDef(patch, index) {
  return {
    key: patch.key || `detail-patch-${index}`,
    scope: patch.scope || 'colorado',
    group: patch.group || 'lineage',
    path: patch.path,
    type: patch.type || 'detail-patch',
    sourceType: patch.sourceType || 'lineage-stream-context',
    label: patch.label || patch.key || `Detail patch ${index + 1}`,
    minZoom: Number(patch.minZoom ?? 12),
    maxZoom: Number(patch.maxZoom ?? 18),
    pane: patch.pane || 'lineageStreams',
    order: Number(patch.order ?? 90),
    bounds: patch.bounds || null
  };
}

function createMapPanes() {
  map.createPane('lineagePolygons');
  map.getPane('lineagePolygons').style.zIndex = 350;

  map.createPane('referenceHydro');
  map.getPane('referenceHydro').style.zIndex = 410;

  map.createPane('lineageStreams');
  map.getPane('lineageStreams').style.zIndex = 440;

  map.createPane('featuredWaters');
  map.getPane('featuredWaters').style.zIndex = 520;

  map.createPane('mapLabels');
  map.getPane('mapLabels').style.zIndex = 650;
  map.getPane('mapLabels').style.pointerEvents = 'none';
}

function addBaseTiles() {
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd'
  }).addTo(map);

  // Label overlay: labels stay visual-only while Atlas GeoJSON handles clicking/cards.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    pane: 'mapLabels',
    opacity: 0.82
  }).addTo(map);
}

function hydrateLayerVisibilityFromControls() {
  document.querySelectorAll('[data-layer-toggle]').forEach(toggle => {
    const layerGroup = toggle.dataset.layerToggle;

    if (!layerGroup) return;

    layerVisibility[layerGroup] = toggle.checked;
  });
}

function getDesiredLayerDefs() {
  if (!map) return [];

  const zoom = map.getZoom();
  const bounds = map.getBounds();
  const fullCatalog = [...layerCatalog, ...detailPatchCatalog];

  return fullCatalog
    .filter(layerDef => {
      if (layerVisibility[layerDef.group] === false) return false;
      if (zoom < layerDef.minZoom) return false;
      if (zoom > layerDef.maxZoom) return false;
      if (!layerDefIntersectsBounds(layerDef, bounds)) return false;

      return true;
    })
    .sort((a, b) => a.order - b.order);
}

function layerDefIntersectsBounds(layerDef, bounds) {
  if (layerDef.bounds) {
    const patchBounds = L.latLngBounds(
      [layerDef.bounds.south, layerDef.bounds.west],
      [layerDef.bounds.north, layerDef.bounds.east]
    );

    return bounds.intersects(patchBounds);
  }

  return scopeIntersectsBounds(layerDef.scope, bounds);
}

function scopeIntersectsBounds(scope, bounds) {
  const scopeBoundsArray = watershedViews[scope];

  if (!scopeBoundsArray) return true;

  const scopeBounds = L.latLngBounds(scopeBoundsArray);

  return bounds.intersects(scopeBounds);
}

function shouldLayerBeActive(layerDef) {
  return getDesiredLayerDefs().some(desiredLayer => desiredLayer.key === layerDef.key);
}

async function updateActiveLayers() {
  if (!map) return;

  const desiredLayerDefs = getDesiredLayerDefs();
  const desiredKeys = new Set(desiredLayerDefs.map(layerDef => layerDef.key));
  activeDesiredCount = desiredLayerDefs.length;

  // Abort in-flight loads that are no longer useful.
  for (const [key, loadingRecord] of loadingLayers.entries()) {
    if (!desiredKeys.has(key)) {
      loadingRecord.abortController.abort();
      loadingLayers.delete(key);
    }
  }

  // Remove active layers that are no longer useful.
  for (const [key, activeRecord] of activeLayers.entries()) {
    if (!desiredKeys.has(key)) {
      unloadLayer(key, activeRecord);
    }
  }

  refreshActiveLayerStyles();

  // Load missing desired layers.
  for (const layerDef of desiredLayerDefs) {
    if (activeLayers.has(layerDef.key)) continue;
    if (loadingLayers.has(layerDef.key)) continue;

    loadLayer(layerDef);
  }

  updateDataLoadStatus();
}

async function loadLayer(layerDef) {
  const abortController = new AbortController();

  loadingLayers.set(layerDef.key, {
    layerDef,
    abortController
  });

  updateDataLoadStatus();

  try {
    const response = await fetch(layerDef.path, {
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${layerDef.path}`);
    }

    const data = await response.json();

    if (!shouldLayerBeActive(layerDef)) {
      return;
    }

    const layer = createLayerFromGeoJson(data, layerDef);

    if (!layer) return;

    layer.addTo(map);

    activeLayers.set(layerDef.key, {
      layerDef,
      layer
    });
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(`Could not load ${layerDef.label}:`, error);
    }
  } finally {
    loadingLayers.delete(layerDef.key);
    updateDataLoadStatus();
  }
}

function unloadLayer(key, activeRecord) {
  const { layer } = activeRecord;

  if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  }

  if (layer.clearLayers) {
    layer.clearLayers();
  }

  activeLayers.delete(key);
  updateDataLoadStatus();
}

function createLayerFromGeoJson(data, layerDef) {
  const sourceType = layerDef.sourceType || layerDef.type;

  if (sourceType === 'lineage-polygons') {
    return createLineagePolygonLayer(data, layerDef);
  }

  if (sourceType === 'lineage-stream-context') {
    return createLineageStreamContextLayer(data, layerDef);
  }

  if (sourceType === 'interpreted') {
    return createInterpretedFeaturedLayer(data, layerDef);
  }

  return createReferenceLayer(data, layerDef, sourceType);
}

function createReferenceLayer(data, layerDef, sourceType) {
  return L.geoJSON(data, {
    pane: layerDef.pane || 'referenceHydro',
    filter: feature => !isPointGeometry(feature),
    pointToLayer: () => null,
    style: feature => styleReferenceFeature(feature, layerDef, sourceType),
    interactive: false,
    smoothFactor: 1.5
  });
}

function createInterpretedFeaturedLayer(data, layerDef) {
  return L.geoJSON(data, {
    pane: layerDef.pane || 'featuredWaters',
    filter: feature => isLineGeometry(feature) && !isPointGeometry(feature),
    style: styleStream,
    onEachFeature: (feature, layer) => {
      feature.properties = {
        ...feature.properties,
        sourceLayer: 'interpreted',
        sourceLabel: layerDef.label
      };

      bindFeaturedStreamEvents(feature, layer);
    },
    smoothFactor: 1.5
  });
}

function createLineagePolygonLayer(data, layerDef) {
  return L.geoJSON(data, {
    pane: layerDef.pane || 'lineagePolygons',
    filter: feature => {
      const type = feature.geometry?.type || '';
      return type === 'Polygon' || type === 'MultiPolygon';
    },
    style: styleLineagePolygon,
    interactive: false,
    smoothFactor: 1.5
  });
}

function createLineageStreamContextLayer(data, layerDef) {
  return L.geoJSON(data, {
    pane: layerDef.pane || 'lineageStreams',
    filter: feature => isLineGeometry(feature) && !isPointGeometry(feature),
    style: feature => styleLineageStreamContext(feature, layerDef),
    interactive: false,
    smoothFactor: 1.5
  });
}

function refreshActiveLayerStyles() {
  for (const activeRecord of activeLayers.values()) {
    const { layerDef, layer } = activeRecord;

    if (!layer.setStyle) continue;

    if (layerDef.sourceType === 'interpreted') {
      layer.setStyle(styleStream);
      continue;
    }

    if (layerDef.sourceType === 'lineage-polygons') {
      layer.setStyle(styleLineagePolygon);
      continue;
    }

    if (layerDef.sourceType === 'lineage-stream-context') {
      layer.setStyle(styleLineageStreamContext);
      continue;
    }

    layer.setStyle(feature => styleReferenceFeature(feature, layerDef, layerDef.sourceType));
  }
}

function styleReferenceFeature(feature, layerDef, sourceType) {
  const zoom = map.getZoom();
  const props = feature.properties || {};
  const geometryType = feature.geometry?.type || '';

  const isPolygon = geometryType.includes('Polygon');

  const hasName = Boolean(
    props.name ||
    props.gnis_name ||
    props.GNIS_Name ||
    props.GNIS_NAME
  );

  if (isPolygon || sourceType === 'lakes') {
    return {
      color: layerDef.style?.color || '#3b9fc6',
      weight: layerDef.style?.weight || 1.2,
      opacity: layerDef.style?.opacity || 0.65,
      fillColor: layerDef.style?.fillColor || layerDef.style?.color || '#3b9fc6',
      fillOpacity: layerDef.style?.fillOpacity ?? 0.18,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }

  return {
    color: layerDef.style?.color || '#38bdf8',
    weight: zoom <= 8 ? 0.18 : zoom <= 10 ? 0.35 : zoom <= 12 ? 0.6 : 0.9,
    opacity: hasName
      ? zoom <= 8 ? 0.22 : zoom <= 10 ? 0.38 : 0.55
      : zoom <= 8 ? 0.08 : zoom <= 10 ? 0.16 : zoom <= 12 ? 0.28 : 0.42,
    fillColor: layerDef.style?.fillColor || layerDef.style?.color || '#3b9fc6',
    fillOpacity: layerDef.style?.fillOpacity ?? 0.16,
    dashArray: layerDef.style?.dashArray,
    lineCap: 'round',
    lineJoin: 'round'
  };
}

function styleStream(feature) {
  const mode = modes[currentModeIndex].key;
  const speciesKey = feature.properties?.[mode];
  const zoom = map.getZoom();

  return {
    color: speciesColors[speciesKey]?.color || speciesColors.unknown.color,
    weight: zoom <= 8 ? 0.9 : zoom <= 10 ? 1.2 : zoom <= 12 ? 1.6 : 2.1,
    opacity: zoom <= 8 ? 0.48 : zoom <= 10 ? 0.6 : 0.75,
    lineCap: 'round',
    lineJoin: 'round'
  };
}

function styleLineagePolygon(feature) {
  const color = getLineageColor(feature);

  return {
    color,
    weight: 1,
    opacity: 0.25,
    fillColor: color,
    fillOpacity: 0.04,
    interactive: false
  };
}

function styleLineageStreamContext(feature, file = {}) {
  const color = getLineageColor(feature);

  const isNaturalDetailTile =
    file.type === 'colorado-natural-stream-detail-tile-v1' ||
    file.path?.includes('colorado_natural_stream_detail_tiles_v1');

  if (isNaturalDetailTile) {
    return {
      color,
      weight: 0.85,
      opacity: 0.38,
      interactive: false,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }

  return {
    color,
    weight: 0.8,
    opacity: 0.28,
    interactive: false,
    lineCap: 'round',
    lineJoin: 'round'
  };
}

function getLineageColor(feature) {
  const key =
    feature.properties?.lineageKey ||
    feature.properties?.lineage ||
    feature.properties?.historic;

  return speciesColors[key]?.color || '#64748b';
}

function bindFeaturedStreamEvents(feature, layer) {
  layer.on('click', () => {
    selectedStream = feature.properties;
    renderStreamCard(selectedStream);
    layer.bringToFront();
  });

  layer.on('mouseover', () => {
    const zoom = map.getZoom();

    layer.setStyle({
      weight: zoom <= 8 ? 1.5 : zoom <= 10 ? 2.0 : zoom <= 12 ? 2.5 : 3.0,
      opacity: 0.95
    });
  });

  layer.on('mouseout', () => {
    layer.setStyle(styleStream(feature));
  });

  layer.bindTooltip(getWaterName(feature.properties), {
    permanent: false,
    direction: 'top',
    sticky: true,
    className: 'stream-tooltip'
  });
}

function isPointGeometry(feature) {
  const type = feature.geometry?.type || '';
  return type === 'Point' || type === 'MultiPoint';
}

function isLineGeometry(feature) {
  const type = feature.geometry?.type || '';
  return type === 'LineString' || type === 'MultiLineString';
}

function renderLegend() {
  const mode = modes[currentModeIndex].key;
  const legendItems = legendByMode[mode] || legendByMode.current;
  const list = document.getElementById('legend-list');

  if (!list) return;

  list.innerHTML = legendItems
    .map(key => {
      const item = speciesColors[key] || speciesColors.unknown;

      return `
        <div class="legend-row">
          <span class="swatch" style="background: ${item.color}"></span>
          <span>${item.label}</span>
        </div>
      `;
    })
    .join('');
}

function renderMode() {
  const description = document.getElementById('mode-description');
  if (!description) return;

  description.textContent = modes[currentModeIndex].description;
}

function renderStreamCard(stream) {
  const mode = modes[currentModeIndex].key;
  const activeKey = stream[mode];
  const activeLabel = speciesColors[activeKey]?.label || 'Unknown';
  const card = document.getElementById('stream-card');

  if (!card) return;

  card.innerHTML = `
    <p class="eyebrow">Selected water</p>
    <h2>${escapeHtml(getWaterName(stream))}</h2>
    <p>${escapeHtml(stream.note || '')}</p>
    <dl>
      <dt>Layer</dt><dd>${escapeHtml(modeLabel(mode))}</dd>
      <dt>Shown as</dt><dd>${escapeHtml(activeLabel)}</dd>
      <dt>Mapped name</dt><dd>${escapeHtml(stream.sourceName || stream.name || 'Unknown')}</dd>
      <dt>Basin</dt><dd>${escapeHtml(stream.basin || 'Unknown')}</dd>
      <dt>State</dt><dd>${escapeHtml(stream.state || 'Unknown')}</dd>
      <dt>Confidence</dt><dd>${escapeHtml(stream.confidence || 'Prototype / needs review')}</dd>
      <dt>Geometry status</dt><dd>${escapeHtml(geometryStatusLabel(stream))}</dd>
      <dt>Geometry source</dt><dd>${escapeHtml(stream.sourceLabel || stream.geometrySource || 'Unknown')}</dd>
      <dt>Trout source</dt><dd>${escapeHtml(stream.troutSource || 'Unknown')}</dd>
    </dl>
  `;
}

function getWaterName(stream) {
  return (
    stream?.display_name ||
    stream?.displayName ||
    stream?.name ||
    stream?.sourceName ||
    stream?.GNIS_Name ||
    stream?.gnis_name ||
    stream?.GNIS_NAME ||
    'Unnamed water'
  );
}

function geometryStatusLabel(stream) {
  if (stream.sourceLayer === 'osm') {
    return 'osm-supplement-review-needed';
  }

  return stream.geometryStatus || 'Prototype / review needed';
}

function modeLabel(mode) {
  if (mode === 'historic') return 'Historic native';
  if (mode === 'current') return 'Current likely';
  return 'Recovery status';
}

function featureMatchesBounds(feature, bounds) {
  if (!bounds) return true;
  if (!feature.geometry?.coordinates) return false;

  const coordinates = flattenCoordinates(feature.geometry.coordinates);

  return coordinates.some(([lng, lat]) =>
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function flattenCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return [];

  if (typeof coordinates[0] === 'number') {
    return [coordinates];
  }

  return coordinates.flatMap(flattenCoordinates);
}

function updateDataLoadStatus() {
  const status = document.getElementById('data-load-status');
  if (!status) return;

  if (!map) {
    status.textContent = 'Map not initialized';
    return;
  }

  const zoom = map.getZoom();
  const loadingCount = loadingLayers.size;
  const activeCount = activeLayers.size;

  status.textContent =
    `Zoom ${zoom} · Active ${activeCount} of ${activeDesiredCount} LOD layers` +
    (loadingCount ? ` · Loading ${loadingCount}` : '');
}

function debounce(fn, wait = 150) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);

    timeoutId = window.setTimeout(() => {
      fn(...args);
    }, wait);
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initDeepTimeStory() {
  const deepTimeVisual = document.querySelector('.deep-time-visual');
  const deepTimeCaption = document.querySelector('#deepTimeCaption');
  const deepTimeScenes = document.querySelectorAll('.deep-time-scene');

  const deepTimeCaptions = {
    coast:
      'Ancestral cutthroat begin on the Pacific side, moving through cold coastal streams and river corridors.',
    inland:
      'Over generations, trout expand inland through connected western rivers before modern basin boundaries fully separate them.',
    ice:
      'Glaciers, ice dams, and huge pluvial lakes reshape the West, creating temporary pathways and new barriers.',
    flood:
      'Catastrophic floods and shifting headwaters rearrange the map, connecting some waters while tearing others apart.',
    isolation:
      'As basins separate, trout become isolated in different watersheds and begin following their own evolutionary paths.',
    modern:
      'Modern cutthroat lineages are the living record of those old waters, isolated basins, floods, and headwater connections.'
  };

  if (!deepTimeVisual || !deepTimeScenes.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const stage = entry.target.dataset.stage;
        deepTimeVisual.dataset.stage = stage;

        if (deepTimeCaption && deepTimeCaptions[stage]) {
          deepTimeCaption.textContent = deepTimeCaptions[stage];
        }
      });
    },
    {
      threshold: 0.55
    }
  );

  deepTimeScenes.forEach(scene => observer.observe(scene));
}
