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
  './data/geojson/interpreted/colorado_natural_stream_detail_tile_index_v2.json';

const NAMED_WATER_OCCURRENCE_TILE_INDEX_PATHS = [
  './data/geojson/interpreted/colorado_named_water_occurrences_v1_tier1_tile_index.json',
  './data/geojson/interpreted/colorado_named_water_occurrences_v1_tier2_tile_index.json',
  './data/geojson/interpreted/colorado_named_water_occurrences_v1_tier3_tile_index.json',
  './data/geojson/interpreted/colorado_named_water_occurrences_v1_tier4_tile_index.json'
];

const WATERBODY_OBJECT_TILE_INDEX_PATH =
  './data/geojson/interpreted/colorado_waterbody_objects_v1_tile_index.json';

const NAMED_WATER_CORRIDOR_TILE_INDEX_PATH =
  './data/geojson/interpreted/colorado_named_water_corridors_v1_tile_index.json';

const ATLAS_OBJECT_SEARCH_INDEX_PATH =
  './data/geojson/interpreted/colorado_atlas_object_search_index_v1.json?v=3';

let atlasSearchEntries = [];
let atlasSearchReady = false;

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
    maxZoom: 9.99,
    pane: 'lineageStreams',
    order: 46
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
  initAtlasSearchControl();
  loadAtlasObjectSearchIndex();
  renderLegend();
  renderMode();
  updateDataLoadStatus();

  Promise.allSettled([
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

async function loadDetailPatchIndex() {
  const indexPaths = [
  DETAIL_PATCH_INDEX_PATH,
  NATURAL_STREAM_TILE_INDEX_PATH,
  ...NAMED_WATER_OCCURRENCE_TILE_INDEX_PATHS,
  NAMED_WATER_CORRIDOR_TILE_INDEX_PATH,
  WATERBODY_OBJECT_TILE_INDEX_PATH
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

function injectAtlasSearchStyles() {
  if (document.getElementById('atlas-search-styles')) return;

  const style = document.createElement('style');
  style.id = 'atlas-search-styles';
  style.textContent = `
    .atlas-search-shell {
      position: absolute;
      top: 14px;
      left: 50%;
      width: min(360px, calc(100% - 28px));
      transform: translateX(-50%);
      z-index: 1000;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .atlas-search-toggle {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      margin: 0 auto;
      border: 1px solid rgba(31, 41, 55, 0.18);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.94);
      color: #13231d;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.22);
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    }

    .atlas-search-toggle:hover,
    .atlas-search-toggle:focus {
      background: #ffffff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.28);
      outline: none;
    }

    .atlas-search-shell.is-open .atlas-search-toggle {
      background: #243a34;
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.18);
    }

    .atlas-search-control {
      display: none;
      box-sizing: border-box;
      width: 100%;
      margin-top: 8px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 14px 36px rgba(15, 23, 42, 0.28);
      color: #1f2933;
    }

    .atlas-search-shell.is-open .atlas-search-control {
      display: block;
    }

    .atlas-search-input-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

   .atlas-search-control input {
      box-sizing: border-box;
      flex: 1 1 auto;
      width: auto;
      min-width: 0;
      padding: 10px 11px;
      border: 1px solid rgba(31, 41, 55, 0.24);
      border-radius: 10px;
      font-size: 15px;
      outline: none;
      background: #ffffff;
      color: #111827;
    }

    .atlas-search-control input:focus {
      border-color: rgba(22, 101, 52, 0.65);
      box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.12);
    }

    .atlas-search-close {
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      border: 1px solid rgba(31, 41, 55, 0.18);
      border-radius: 999px;
      background: rgba(248, 250, 252, 0.96);
      color: #334155;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }

    .atlas-search-status {
      margin-top: 7px;
      font-size: 11px;
      color: #64748b;
    }

    .atlas-search-results {
      margin-top: 8px;
      display: grid;
      gap: 6px;
      max-height: min(280px, calc(100vh - 220px));
      overflow: auto;
    }

    .atlas-search-result {
      display: block;
      width: 100%;
      padding: 9px 10px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 10px;
      background: rgba(248, 250, 252, 0.96);
      text-align: left;
      cursor: pointer;
    }

    .atlas-search-result:hover,
    .atlas-search-result:focus {
      border-color: rgba(22, 101, 52, 0.55);
      background: rgba(240, 253, 244, 0.96);
    }

    .atlas-search-result-name {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #111827;
    }

    .atlas-search-result-meta {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.3;
    }

    @media (max-width: 600px) {
      .atlas-search-shell {
        top: 10px;
        width: min(360px, calc(100% - 20px));
      }

      .atlas-search-toggle {
        width: 42px;
        height: 42px;
        font-size: 19px;
      }

      .atlas-search-control {
        padding: 9px;
      }

      .atlas-search-results {
        max-height: min(260px, calc(100vh - 210px));
      }
    }
  `;

  document.head.appendChild(style);
}

function initAtlasSearchControl() {
  injectAtlasSearchStyles();

  const mapContainer = map.getContainer();

  if (document.getElementById('atlas-search-shell')) return;

  const shell = L.DomUtil.create('div', 'atlas-search-shell');
  shell.id = 'atlas-search-shell';

  shell.innerHTML = `
    <button
      class="atlas-search-toggle"
      type="button"
      aria-label="Open Atlas search"
      aria-expanded="false"
      title="Search waters"
    >
      🔍
    </button>

    <div class="atlas-search-control" role="search">
      <div class="atlas-search-input-row">
        <input
          type="search"
          class="atlas-search-input"
          placeholder="Search waters, lakes, reservoirs..."
          autocomplete="off"
          spellcheck="false"
          aria-label="Search Atlas waters"
        />
        <button
          class="atlas-search-close"
          type="button"
          aria-label="Close search"
          title="Close search"
        >
          ×
        </button>
      </div>

      <div class="atlas-search-status">Loading search index...</div>
      <div class="atlas-search-results" aria-live="polite"></div>
    </div>
  `;

  L.DomEvent.disableClickPropagation(shell);
  L.DomEvent.disableScrollPropagation(shell);

  const toggle = shell.querySelector('.atlas-search-toggle');
  const closeButton = shell.querySelector('.atlas-search-close');
  const input = shell.querySelector('.atlas-search-input');
  const status = shell.querySelector('.atlas-search-status');
  const results = shell.querySelector('.atlas-search-results');

  function openSearch() {
    shell.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');

    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }

  function closeSearch() {
    shell.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    input.blur();
  }

  toggle.addEventListener('click', () => {
    if (shell.classList.contains('is-open')) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  closeButton.addEventListener('click', closeSearch);

  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeSearch();
    }
  });

  let debounceId = null;

  input.addEventListener('input', () => {
    clearTimeout(debounceId);

    debounceId = setTimeout(() => {
      renderAtlasSearchResults(input.value, status, results);
    }, 120);
  });

  results.addEventListener('click', event => {
  const button = event.target.closest('.atlas-search-result');
  if (!button) return;

  const entry = atlasSearchEntries.find(item => item.id === button.dataset.searchId);
  if (!entry) return;

  selectAtlasSearchResult(entry);

  input.value = entry.display_name;
  results.innerHTML = '';
  status.textContent = `${entry.display_name}`;

  closeSearch();
});

  mapContainer.appendChild(shell);
}

async function loadAtlasObjectSearchIndex() {
  try {
    const response = await fetch(ATLAS_OBJECT_SEARCH_INDEX_PATH);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    atlasSearchEntries = Array.isArray(data.entries) ? data.entries : [];
    atlasSearchReady = true;

    const status = document.querySelector('.atlas-search-status');
    if (status) {
      status.textContent = `${atlasSearchEntries.length.toLocaleString()} searchable waters`;
    }
  } catch (error) {
    console.error('Could not load Atlas object search index:', error);

    const status = document.querySelector('.atlas-search-status');
    if (status) {
      status.textContent = 'Search unavailable';
    }
  }
}

function normalizeAtlasSearchQuery(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function scoreAtlasSearchEntry(entry, query, tokens) {
  let score = 0;
  const name = entry.normalized_name || normalizeAtlasSearchQuery(entry.display_name);
  const searchText = entry.search_text || '';

  if (name === query) score += 1000;
  if (name.startsWith(query)) score += 600;
  if (name.includes(query)) score += 300;

  for (const token of tokens) {
    if (name === token) score += 120;
    if (name.startsWith(token)) score += 80;
    if (name.includes(token)) score += 50;
    if (searchText.includes(token)) score += 20;
  }

  if (entry.atlas_layer === 'waterbody_object') score += 8;
  if (entry.atlas_layer === 'named_water_corridor' && name === query) score += 200;
  if (entry.object_type === 'stream') score += 4;

  return score;
}

function getAtlasSearchMatches(query, limit = 8) {
  const normalizedQuery = normalizeAtlasSearchQuery(query);

  if (!atlasSearchReady || normalizedQuery.length < 2) {
    return [];
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);

  return atlasSearchEntries
    .filter(entry => {
      const searchText = entry.search_text || '';
      const name = entry.normalized_name || '';

      return tokens.every(token =>
        name.includes(token) ||
        searchText.includes(token)
      );
    })
    .map(entry => ({
      entry,
      score: scoreAtlasSearchEntry(entry, normalizedQuery, tokens)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.display_name.localeCompare(b.entry.display_name);
    })
    .slice(0, limit)
    .map(result => result.entry);
}

function escapeAtlasSearchHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderAtlasSearchResults(query, statusEl, resultsEl) {
  const normalizedQuery = normalizeAtlasSearchQuery(query);

  if (!atlasSearchReady) {
    statusEl.textContent = 'Loading search index...';
    resultsEl.innerHTML = '';
    return;
  }

  if (normalizedQuery.length < 2) {
    statusEl.textContent = `${atlasSearchEntries.length.toLocaleString()} searchable waters`;
    resultsEl.innerHTML = '';
    return;
  }

  const matches = getAtlasSearchMatches(normalizedQuery);

  statusEl.textContent = matches.length
    ? `${matches.length} best matches`
    : 'No matches';

  resultsEl.innerHTML = matches.map(entry => {
    const typeLabel = entry.object_type || 'water';
    const context = entry.local_context || entry.basin || entry.huc8Name || '';

    return `
      <button class="atlas-search-result" type="button" data-search-id="${escapeAtlasSearchHtml(entry.id)}">
        <span class="atlas-search-result-name">${escapeAtlasSearchHtml(entry.display_name)}</span>
        <span class="atlas-search-result-meta">${escapeAtlasSearchHtml(typeLabel)} · ${escapeAtlasSearchHtml(context)}</span>
      </button>
    `;
  }).join('');
}

function buildSelectedPropsFromSearchEntry(entry) {
  const baseProps = {
    display_name: entry.display_name,
    mapped_name: entry.display_name,
    source_name: entry.display_name,
    name: entry.display_name,

    basin: entry.basin || entry.huc8Name || entry.huc8 || '',
    huc8: entry.huc8 || '',
    huc8Name: entry.huc8Name || '',
    lineageKey: entry.lineageKey,
    lineage: entry.lineageKey,
    historic: entry.lineageKey,
    current: entry.lineageKey,
    recovery: entry.lineageKey,
    lineageLabel: entry.lineageLabel || '',
    occurrence_number: entry.occurrence_number || '',

    disambiguator: entry.local_context || entry.basin || entry.huc8Name || '',
    public_notes: entry.local_context || '',

    confidence_public: 'Search result from Atlas object index',
    geometry_status_public: 'Selected Atlas object',
    geometry_source_public: 'Compiled Atlas object index',
    trout_source_public: 'Compiled public recovery and lineage context; expert review recommended'
  };

  if (entry.atlas_layer === 'named_water_corridor') {
    return {
      ...baseProps,
      corridor_id: entry.id,
      water_id: entry.id,
      atlas_layer: 'named_water_corridor',
      object_role: 'named_water_corridor',
      geometry_status_public: 'Aggregate named-water corridor',
      geometry_source_public: entry.geometry_source_public || '',
      source_backed_geometry: entry.source_backed_geometry,
      geometry_source_type: entry.geometry_source_type
    };
  }

  if (entry.atlas_layer === 'waterbody_object') {
    return {
      ...baseProps,
      waterbody_id: entry.id,
      water_id: entry.id,
      occurrence_id: entry.id,
      atlas_layer: 'waterbody_object',
      object_role: 'waterbody_object',
      waterbody_type: entry.waterbody_type || entry.object_type || 'waterbody'
    };
  }

  return {
    ...baseProps,
    occurrence_id: entry.id,
    water_id: entry.id,
    atlas_layer: 'named_water_occurrence',
    object_role: 'named_water_occurrence'
  };
}

function getLatLngBoundsFromSearchEntry(entry) {
  const bounds = entry.bounds;

  if (!bounds) return null;

  return L.latLngBounds(
    [bounds.south, bounds.west],
    [bounds.north, bounds.east]
  );
}

function getTargetZoomForSearchEntry(entry) {
  const bounds = entry.bounds;

  if (entry.atlas_layer === 'named_water_corridor') {
    return Number(entry.minZoom || 6);
  }

  if (!bounds) {
    return entry.atlas_layer === 'waterbody_object'
      ? 15
      : Math.max(Number(entry.minZoom || 13), 13);
  }

  const latSpan = Math.abs(bounds.north - bounds.south);
  const lngSpan = Math.abs(bounds.east - bounds.west);
  const maxSpan = Math.max(latSpan, lngSpan);

  if (entry.atlas_layer === 'waterbody_object') {
    if (maxSpan >= 0.12) return 11;  // very large lakes/reservoirs
    if (maxSpan >= 0.06) return 12;
    if (maxSpan >= 0.025) return 13;
    if (maxSpan >= 0.01) return 14;
    return 15;                       // small lakes/ponds/reservoirs
  }

  if (entry.object_type === 'stream') {
    return Math.max(Number(entry.minZoom || 13), 13);
  }

  return 14;
}

function selectAtlasSearchResult(entry) {
  selectedStream = buildSelectedPropsFromSearchEntry(entry);
  if (!hydrateSelectedCorridorFromActiveLayers()) {
    renderStreamCard(selectedStream);
  }

  const bounds = getLatLngBoundsFromSearchEntry(entry);
  const center = entry.center
    ? [entry.center.lat, entry.center.lng]
    : bounds?.getCenter();

  const targetZoom = getTargetZoomForSearchEntry(entry);
  const isCorridor = entry.atlas_layer === 'named_water_corridor';

  if (bounds) {
    map.once('moveend', () => {
      if (!isCorridor && map.getZoom() < targetZoom && center) {
        map.setView(center, targetZoom);
      }

      updateActiveLayers();
      hydrateSelectedCorridorFromActiveLayers();
      setTimeout(() => {
        hydrateSelectedCorridorFromActiveLayers();
        refreshActiveLayerStyles();
      }, 500);
    });

    map.fitBounds(bounds, isCorridor
      ? { padding: [42, 42] }
      : {
          padding: [42, 42],
          maxZoom: targetZoom
        });
  } else if (center) {
    map.setView(center, targetZoom);
    updateActiveLayers();
    hydrateSelectedCorridorFromActiveLayers();
    setTimeout(() => {
      hydrateSelectedCorridorFromActiveLayers();
      refreshActiveLayerStyles();
    }, 500);
  }

  refreshActiveLayerStyles();
}

function hydrateSelectedCorridorFromActiveLayers() {
  if (!isCorridorObject(selectedStream) || !selectedStream.corridor_id) return false;

  const selectedCorridorId = selectedStream.corridor_id;
  let matchingProperties = null;

  for (const activeRecord of activeLayers.values()) {
    if (activeRecord.layerDef?.sourceType !== 'interpreted') continue;

    activeRecord.layer?.eachLayer?.(featureLayer => {
      const properties = featureLayer.feature?.properties;

      if (
        !matchingProperties &&
        properties?.corridor_id === selectedCorridorId &&
        isCorridorObject(properties)
      ) {
        matchingProperties = properties;
      }
    });

    if (matchingProperties) break;
  }

  return mergeSelectedCorridorProperties(matchingProperties);
}

function mergeSelectedCorridorProperties(properties) {
  if (!properties || !isCorridorObject(selectedStream)) return false;
  if (selectedStream.corridor_id !== properties.corridor_id) return false;

  const alreadyHydrated =
    selectedStream.source_feature_count === properties.source_feature_count &&
    selectedStream.occurrence_count === properties.occurrence_count &&
    selectedStream.source_length_km === properties.source_length_km &&
    selectedStream.geometry_source_public === properties.geometry_source_public;

  if (alreadyHydrated) return false;

  selectedStream = { ...selectedStream, ...properties };
  renderStreamCard(selectedStream);
  return true;
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

  if (sourceType === 'waterbody-objects') {
    return createWaterbodyObjectLayer(data, layerDef);
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
    style: styleInterpretedFeature,
    onEachFeature: (feature, layer) => {
      feature.properties = {
        ...feature.properties,
        sourceLayer: 'interpreted',
        sourceLabel: layerDef.label
      };

      if (isNamedWaterCorridor(feature)) {
        mergeSelectedCorridorProperties(feature.properties);

        bindNamedWaterCorridorEvents(feature, layer);
      } else {
        bindFeaturedStreamEvents(feature, layer);
      }
    },
    smoothFactor: 1.5
  });
}

function createWaterbodyObjectLayer(data, layerDef) {
  return L.geoJSON(data, {
    pane: layerDef.pane || 'featuredWaters',
    style: feature => styleWaterbodyObject(feature),
    interactive: true,
    onEachFeature: bindWaterbodyObjectEvents
  });
}

function styleWaterbodyObject(feature) {
  const props = feature.properties || {};
  const color = getLineageColor(feature);

  const isSelected =
    selectedStream?.waterbody_id &&
    props.waterbody_id &&
    selectedStream.waterbody_id === props.waterbody_id;

  if (isSelected) {
    return {
      color,
      weight: 1.5,
      opacity: 0.68,
      fillColor: color,
      fillOpacity: 0.055,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }

  return {
    color,
    weight: 0.9,
    opacity: 0.035,
    fillColor: color,
    fillOpacity: 0.006,
    lineCap: 'round',
    lineJoin: 'round'
  };
}

function bindWaterbodyObjectEvents(feature, layer) {
  layer.on('click', () => {
    selectedStream = feature.properties;
    renderStreamCard(selectedStream);
    refreshActiveLayerStyles();
    layer.bringToFront();
  });

  layer.on('mouseover', () => {
  const props = feature.properties || {};

  const isSelected =
    selectedStream?.waterbody_id &&
    props.waterbody_id &&
    selectedStream.waterbody_id === props.waterbody_id;

  layer.setStyle({
    weight: isSelected ? 1.6 : 1.3,
    opacity: isSelected ? 0.72 : 0.38,
    fillOpacity: isSelected ? 0.07 : 0.045
  });
});

  layer.on('mouseout', () => {
    const props = feature.properties || {};

    const isSelected =
      selectedStream?.waterbody_id &&
      props.waterbody_id &&
      selectedStream.waterbody_id === props.waterbody_id;

    if (!isSelected) {
      layer.setStyle(styleWaterbodyObject(feature));
    }
  });

  layer.bindTooltip(getWaterName(feature.properties), {
    permanent: false,
    direction: 'top',
    sticky: true,
    className: 'stream-tooltip'
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
      layer.setStyle(styleInterpretedFeature);
      continue;
    }

    if (layerDef.sourceType === 'lineage-polygons') {
      layer.setStyle(styleLineagePolygon);
      continue;
    }

    if (layerDef.sourceType === 'waterbody-objects') {
      layer.setStyle(styleWaterbodyObject);
      continue;
    }

    if (layerDef.sourceType === 'lineage-stream-context') {
      layer.setStyle(feature => styleLineageStreamContext(feature, layerDef));
      continue;
    }

    layer.setStyle(feature => styleReferenceFeature(feature, layerDef, layerDef.sourceType));
  }
}

function isNamedWaterCorridor(feature) {
  const props = feature?.properties || {};

  return (
    props.atlas_layer === 'named_water_corridor' ||
    props.object_role === 'named_water_corridor'
  );
}

function styleInterpretedFeature(feature) {
  return isNamedWaterCorridor(feature)
    ? styleNamedWaterCorridor(feature)
    : styleStream(feature);
}

function styleNamedWaterCorridor(feature) {
  const props = feature.properties || {};
  const color = getLineageColor(feature);
  const zoom = map.getZoom();
  const isSelected =
    selectedStream?.corridor_id &&
    props.corridor_id &&
    selectedStream.corridor_id === props.corridor_id;

  if (isSelected) {
    return {
      color,
      weight: zoom <= 10 ? 4.5 : 5.5,
      opacity: 0.94,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }

  return {
    color,
    weight: zoom <= 10 ? 14 : 18,
    opacity: 0,
    lineCap: 'round',
    lineJoin: 'round'
  };
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
  const color = speciesColors[speciesKey]?.color || speciesColors.unknown.color;
  const props = feature.properties || {};
  const zoom = map.getZoom();

  const isOccurrence =
    props.atlas_layer === 'named_water_occurrence' ||
    props.object_role === 'named_water_occurrence';

  const isSelected =
    selectedStream?.occurrence_id &&
    props.occurrence_id &&
    selectedStream.occurrence_id === props.occurrence_id;

  if (isOccurrence && isSelected) {
    return {
      color,
      weight: zoom <= 12 ? 4 : 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }

  if (isOccurrence) {
    return {
      color,
      weight: zoom <= 12 ? 18 : 24,
      opacity: 0,
      lineCap: 'round',
      lineJoin: 'round'
    };
}

  return {
    color,
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
    file.type === 'colorado-natural-stream-detail-tile-v2' ||
    file.path?.includes('colorado_natural_stream_detail_tiles_v1') ||
    file.path?.includes('colorado_natural_stream_detail_tiles_v2');

  const isMediumGeneralizedContext =
    file.path?.includes('stream_context_named_web_05km') ||
    file.path?.includes('_05km_');

  const isBroadGeneralizedContext =
    file.path?.includes('stream_context_named_web_1km') ||
    file.path?.includes('_1km_');

  if (isNaturalDetailTile) {
    return {
      color,
      weight: 0.95,
      opacity: 0.44,
      interactive: false,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }

  if (isMediumGeneralizedContext) {
  return {
    color,
    weight: 0.28,
    opacity: 0.055,
    interactive: false,
    lineCap: 'round',
    lineJoin: 'round'
  };
}

  if (isBroadGeneralizedContext) {
    return {
      color,
      weight: 0.55,
      opacity: 0.14,
      interactive: false,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }

  return {
    color,
    weight: 0.6,
    opacity: 0.16,
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
  refreshActiveLayerStyles();
  layer.bringToFront();
});

  layer.on('mouseover', () => {
  const props = feature.properties || {};
  const isOccurrence =
    props.atlas_layer === 'named_water_occurrence' ||
    props.object_role === 'named_water_occurrence';

  if (isOccurrence) {
  layer.setStyle({
    weight: 4,
    opacity: 0.75
  });
  return;
}

  const zoom = map.getZoom();

  layer.setStyle({
    weight: zoom <= 8 ? 1.5 : zoom <= 10 ? 2.0 : zoom <= 12 ? 2.5 : 3.0,
    opacity: 0.95
  });
});

  layer.on('mouseout', () => {
  const props = feature.properties || {};
  const isSelected =
    selectedStream?.occurrence_id &&
    props.occurrence_id &&
    selectedStream.occurrence_id === props.occurrence_id;

  if (!isSelected) {
    layer.setStyle(styleStream(feature));
  }
});

  layer.bindTooltip(getWaterName(feature.properties), {
    permanent: false,
    direction: 'top',
    sticky: true,
    className: 'stream-tooltip'
  });
}

function bindNamedWaterCorridorEvents(feature, layer) {
  layer.on('click', () => {
    selectedStream = feature.properties;
    renderStreamCard(selectedStream);
    refreshActiveLayerStyles();
  });

  layer.on('mouseover', () => {
    const props = feature.properties || {};
    const isSelected =
      selectedStream?.corridor_id &&
      props.corridor_id &&
      selectedStream.corridor_id === props.corridor_id;

    if (!isSelected) {
      layer.setStyle({
        weight: map.getZoom() <= 10 ? 3.75 : 4.75,
        opacity: 0.78
      });
    }
  });

  layer.on('mouseout', () => {
    layer.setStyle(styleNamedWaterCorridor(feature));
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
  if (isCorridorObject(stream)) {
    renderCorridorCard(stream);
    return;
  }

  const mode = modes[currentModeIndex].key;
  const activeKey = stream[mode];
  const activeLabel =
    stream[`${mode}_label`] ||
    speciesColors[activeKey]?.label ||
    activeKey ||
    'Unknown';

  const card = getPublicWaterCardFields(stream);
  const cardDescription = card.description
    ? `<p>${escapeHtml(card.description)}</p>`
    : '';

  const cardElement = document.getElementById('stream-card');

  if (!cardElement) return;

  cardElement.innerHTML = `
    <p class="eyebrow">Selected water</p>
    <h2>${escapeHtml(card.displayName)}</h2>
    ${cardDescription}
    <dl>
      <dt>Layer</dt><dd>${escapeHtml(modeLabel(mode))}</dd>
      <dt>Shown as</dt><dd>${escapeHtml(activeLabel)}</dd>
      <dt>Mapped name</dt><dd>${escapeHtml(card.mappedName)}</dd>
      <dt>Local context</dt><dd>${escapeHtml(getOccurrenceLabel(stream))}</dd>
      <dt>Basin</dt><dd>${escapeHtml(card.basin)}</dd>
      <dt>State</dt><dd>${escapeHtml(card.state)}</dd>
      <dt>Confidence</dt><dd>${escapeHtml(card.confidence)}</dd>
      <dt>Geometry status</dt><dd>${escapeHtml(card.geometryStatus)}</dd>
      <dt>Geometry source</dt><dd>${escapeHtml(card.geometrySource)}</dd>
      <dt>Trout source</dt><dd>${escapeHtml(card.troutSource)}</dd>
    </dl>
  `;
}

function isCorridorObject(stream = {}) {
  return (
    stream.atlas_layer === 'named_water_corridor' ||
    stream.object_role === 'named_water_corridor'
  );
}

function renderCorridorCard(stream) {
  const cardElement = document.getElementById('stream-card');
  if (!cardElement) return;

  const summaryFields = [
    ['Length', formatRoundedKilometers(stream.source_length_km)],
    ['Mapped occurrences', stream.occurrence_count],
    ['Historic lineage', getLineageDisplayLabel(stream)],
    ['Watershed', stream.basin || stream.huc8Name || firstValue(stream.huc8Names)],
    ['State', stream.state],
    ['Geometry', getFriendlyCorridorGeometry(stream)]
  ];

  const technicalFields = [
    ['Corridor ID', stream.corridor_id],
    ['GNIS ID', stream.GNIS_ID || stream.gnis_id || stream.gnisId],
    ['Source feature count', stream.source_feature_count],
    ['Line-part count', stream.unique_line_part_count ?? stream.line_part_count],
    ['Vertex count', stream.vertex_count],
    ['Source length', formatDetailedKilometers(stream.source_length_km)],
    ['Geometry source', stream.geometry_source_public || stream.geometrySource],
    ['Geometry status', stream.geometry_status_public || stream.geometryStatus],
    ['HUC8', stream.huc8 || joinValues(stream.huc8s)],
    ['Build version', stream.build_version || stream.buildVersion],
    ['Schema version', stream.schema_version || stream.schemaVersion],
    ['Geometry version', stream.geometry_version || stream.geometryVersion],
    ['Source version', stream.source_version || stream.sourceVersion],
    ['Version', stream.version]
  ];
  const technicalRows = renderDefinitionRows(technicalFields);

  cardElement.innerHTML = `
    <p class="eyebrow">Selected river</p>
    <h2>${escapeHtml(getWaterName(stream))}</h2>
    <p class="stream-card-subtitle">River corridor</p>
    <dl class="corridor-summary">
      ${renderDefinitionRows(summaryFields)}
    </dl>
    ${technicalRows ? `
      <details class="corridor-technical">
        <summary>Technical details</summary>
        <div class="corridor-technical-content">
          <dl>${technicalRows}</dl>
        </div>
      </details>
    ` : ''}
  `;
}

function renderDefinitionRows(fields) {
  return fields
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');
}

function formatRoundedKilometers(value) {
  const length = Number(value);
  return Number.isFinite(length) ? `${Math.round(length)} km` : '';
}

function formatDetailedKilometers(value) {
  const length = Number(value);
  return Number.isFinite(length)
    ? `${length.toLocaleString(undefined, { maximumFractionDigits: 3 })} km`
    : '';
}

function getLineageDisplayLabel(stream = {}) {
  const key = stream.lineageKey || stream.lineage || stream.historic;
  return speciesColors[key]?.label || stream.lineageLabel || stream.historic_label || key || '';
}

function getFriendlyCorridorGeometry(stream = {}) {
  const source = String(stream.geometry_source_public || stream.geometrySource || '').toLowerCase();
  const isSourceBacked =
    stream.source_backed_geometry === true ||
    stream.geometry_source_type === 'source-backed-nhd-mainstem' ||
    source.includes('source-backed') ||
    source.includes('nhd named mainstem');

  if (isSourceBacked) return 'Source-backed NHD mainstem';

  if (source.includes('grouped atlas named-water occurrence geometry')) {
    return 'Occurrence-derived corridor';
  }

  return 'Named-water corridor';
}

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function joinValues(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

function getPublicWaterCardFields(stream = {}) {
  const isCorridor = isCorridorObject(stream);

  return {
    displayName:
      stream.display_name ||
      stream.displayName ||
      stream.name ||
      'Selected water',

    description:
      stream.public_notes ||
      stream.note ||
      '',

    mappedName:
      stream.mapped_name ||
      stream.mappedName ||
      stream.source_name ||
      stream.sourceName ||
      stream.name ||
      (isCorridor ? stream.display_name : '') ||
      'Unknown',

    basin:
      stream.basin ||
      stream.lineageBasin ||
      stream.huc8Name ||
      stream.huc8 ||
      (isCorridor && Array.isArray(stream.huc8Names) ? stream.huc8Names.join(' / ') : '') ||
      'Unknown',

    state:
      stream.state ||
      'Unknown',

    confidence:
      stream.confidence_public ||
      stream.confidence ||
      'Generalized public map',

    geometryStatus:
      stream.geometry_status_public ||
      stream.geometryStatus ||
      'Generalized named-water reach',

    geometrySource:
      stream.geometry_source_public ||
      stream.sourceLabel ||
      stream.geometrySource ||
      'Grouped public hydrography segments',

    troutSource:
      stream.trout_source_public ||
      stream.troutSource ||
      'Compiled public recovery and lineage context; expert review recommended'
  };
}

function getOccurrenceLabel(stream = {}) {
  if (
    stream.atlas_layer === 'named_water_corridor' ||
    stream.object_role === 'named_water_corridor'
  ) {
    return 'River corridor';
  }

  if (
    stream.atlas_layer === 'waterbody_object' ||
    stream.object_role === 'waterbody_object'
  ) {
    return [
      stream.huc8Name || stream.huc8,
      stream.waterbody_type,
      stream.occurrence_number ? `occurrence ${stream.occurrence_number}` : null
    ].filter(Boolean).join(' · ') || 'Named waterbody';
  }

  if (stream.atlas_layer === 'anchor_named_water') {
    return stream.disambiguator || `${stream.basin || 'Colorado'} · anchor river corridor`;
  }

  const rawContext = stream.disambiguator || '';
  const contextParts = rawContext
    .split(' · ')
    .map(part => part.trim())
    .filter(Boolean);

  const uniqueContextParts = [...new Set(contextParts)];

  const parts = [
    stream.basin,
    stream.historic_label,
    ...uniqueContextParts.filter(part =>
      part !== stream.basin &&
      part !== stream.historic_label &&
      !part.toLowerCase().startsWith('occurrence ')
    ),
    stream.occurrence_number ? `occurrence ${stream.occurrence_number}` : null
  ].filter(Boolean);

  return parts.join(' · ') || stream.disambiguator || 'Named-water occurrence';
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
  const center = map.getCenter();
  const loadingCount = loadingLayers.size;
  const activeCount = activeLayers.size;
  
  status.textContent =
    `Zoom ${zoom} · ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)} · ` +
    `Active ${activeCount} of ${activeDesiredCount} LOD layers` +
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
