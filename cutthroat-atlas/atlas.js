const speciesColors = {
  greenback: { label: 'Greenback CT', color: '#22c55e' },
  coloradoRiver: { label: 'Colorado River CT', color: '#e85d3f' },
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

const DEFAULT_SCOPE = 'poudre';

const hydroFiles = [
  {
    scope: 'poudre',
    path: './data/geojson/nhd/cache-la-poudre-named-flowlines.geojson',
    type: 'nhd-cache-la-poudre',
    sourceType: 'nhd',
    label: 'USGS NHD named flowlines — Cache la Poudre',
    style: {
      color: '#8b9cff',
      weight: 1.2,
      opacity: 0.32
    }
  },
  {
    scope: 'bigThompson',
    path: './data/geojson/nhd/big-thompson-named-flowlines.geojson',
    type: 'nhd-big-thompson',
    sourceType: 'nhd',
    label: 'USGS NHD named flowlines — Big Thompson',
    style: {
      color: '#8b9cff',
      weight: 1.2,
      opacity: 0.32
    }
  },
  {
    scope: 'southPlatte',
    path: './data/geojson/nhd/south-platte-named-flowlines.geojson',
    type: 'nhd-south-platte',
    sourceType: 'nhd',
    label: 'USGS NHD named flowlines — South Platte',
    style: {
      color: '#8b9cff',
      weight: 1.2,
      opacity: 0.32
    }
  },
  {
    scope: 'headwaters',
    path: './data/geojson/nhd/south-platte-headwaters-south-named-flowlines.geojson',
    type: 'nhd-south-platte-headwaters-south',
    sourceType: 'nhd',
    label: 'USGS NHD named flowlines — South Platte headwaters south',
    style: {
      color: '#8b9cff',
      weight: 1.2,
      opacity: 0.32
    }
  },

  {
    scope: 'poudre',
    path: './data/geojson/osm/cache-la-poudre-natural-streams.geojson',
    type: 'osm-cache-la-poudre',
    sourceType: 'osm',
    label: 'OpenStreetMap natural streams — Cache la Poudre',
    style: {
      color: '#3b9fc6',
      weight: 1.6,
      opacity: 0.55
    }
  },
  {
    scope: 'bigThompson',
    path: './data/geojson/osm/big-thompson-natural-streams.geojson',
    type: 'osm-big-thompson',
    sourceType: 'osm',
    label: 'OpenStreetMap natural streams — Big Thompson',
    style: {
      color: '#3b9fc6',
      weight: 1.6,
      opacity: 0.55
    }
  },
  {
    scope: 'southPlatte',
    path: './data/geojson/osm/south-platte-natural-streams.geojson',
    type: 'osm-south-platte',
    sourceType: 'osm',
    label: 'OpenStreetMap natural streams — South Platte',
    style: {
      color: '#3b9fc6',
      weight: 1.6,
      opacity: 0.55
    }
  },
  {
    scope: 'headwaters',
    path: './data/geojson/osm/south-platte-headwaters-natural-streams.geojson',
    type: 'osm-south-platte-headwaters',
    sourceType: 'osm',
    label: 'OpenStreetMap natural streams — South Platte headwaters',
    style: {
      color: '#3b9fc6',
      weight: 1.6,
      opacity: 0.55
    }
  },
  {
    scope: 'headwaters',
    path: './data/geojson/osm/south-platte-headwaters-south-natural-streams.geojson',
    type: 'osm-south-platte-headwaters-south',
    sourceType: 'osm',
    label: 'OpenStreetMap natural streams — South Platte headwaters south',
    style: {
      color: '#3b9fc6',
      weight: 1.6,
      opacity: 0.55
      }
    },
    {
  scope: 'headwaters',
  path: './data/geojson/nhd/Arkansas_basin_lakes.geojson',
  type: 'nhd-arkansas-basin-lakes',
  sourceType: 'lakes',
  label: 'USGS NHD waterbodies — Arkansas Basin lakes and reservoirs',
  style: {
    color: '#38bdf8',
    weight: 1,
    opacity: 0.75,
    fillColor: '#38bdf8',
    fillOpacity: 0.18
  }
  }
];

const watershedViews = {
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

let featuredWaters = [];
let selectedStream = null;
let currentModeIndex = 0;

const loadedHydroFiles = new Set();
const matchedFeaturedWaterIds = new Set();
const featuredStreamLayers = [];

const hydroLayerGroups = {
  nhd: L.layerGroup(),      // NHD flowlines
  osm: L.layerGroup(),      // OSM streams
  lakes: L.layerGroup()     // NHD waterbody polygons
};

const featuredLayerGroup = L.layerGroup();

const map = L.map('map', {
  zoomControl: true,
  scrollWheelZoom: true
}).setView([40.72, -105.72], 10);

hydroLayerGroups.nhd.addTo(map);
hydroLayerGroups.osm.addTo(map);
hydroLayerGroups.lakes.addTo(map);
featuredLayerGroup.addTo(map);

hydroLayerGroups.featured = featuredLayerGroup;

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd'
}).addTo(map);

renderLegend();
renderMode();
updateDataLoadStatus();

fetch('./data/waters/index.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for data/waters/index.json`);
    }

    return response.json();
  })
  .then(async data => {
    featuredWaters = data;
    await loadHydroFilesForScope(DEFAULT_SCOPE);
  })
  .catch(error => {
    console.error('Could not load featured waters:', error);
  });

async function loadHydroFilesForScope(scope) {
  const filesForScope = hydroFiles
    .filter(file => file.scope === scope)
    .sort((a, b) => sourceSortOrder(a.sourceType) - sourceSortOrder(b.sourceType));

  for (const file of filesForScope) {
    if (loadedHydroFiles.has(file.path)) continue;

    await loadHydroFile(file);
    loadedHydroFiles.add(file.path);
    updateDataLoadStatus();
  }
}

async function loadVisibleScopes() {
  const currentBounds = map.getBounds();

  for (const [scope, boundsArray] of Object.entries(watershedViews)) {
    const scopeBounds = L.latLngBounds(boundsArray);

    if (currentBounds.intersects(scopeBounds)) {
      await loadHydroFilesForScope(scope);
    }
  }
}

async function loadHydroFile(file) {
  try {
    const response = await fetch(file.path);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${file.path}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('json')) {
      const text = await response.text();
      throw new Error(`Expected JSON for ${file.path}, got: ${text.slice(0, 80)}`);
    }

    const data = await response.json();
    const sourceType = file.sourceType || file.type;

    addReferenceLayer(data, file, sourceType);

    if (!['nhd', 'osm'].includes(sourceType)) return;

    addFeaturedLayer(data, file, sourceType);
  } catch (error) {
    console.error(`Could not load ${file.label}:`, error);
  }
}

function addReferenceLayer(data, file, sourceType) {
  const hydroLayer = L.geoJSON(data, {
    style: {
      color: file.style?.color || '#3b9fc6',
      weight: file.style?.weight || 1.6,
      opacity: file.style?.opacity || 0.65,
      fillColor: file.style?.fillColor || file.style?.color || '#3b9fc6',
      fillOpacity: file.style?.fillOpacity ?? 0.2,
      lineCap: 'round',
      lineJoin: 'round'
    },
    interactive: false
  });

  hydroLayer.addTo(hydroLayerGroups[sourceType]);
}

function addFeaturedLayer(data, file, sourceType) {
  const featuredStreams = {
    type: 'FeatureCollection',
    features: data.features
      .map(feature => buildFeaturedFeature(feature, file, sourceType))
      .filter(Boolean)
  };

  if (featuredStreams.features.length === 0) return;

  const layer = L.geoJSON(featuredStreams, {
    style: styleStream,
    onEachFeature: bindFeaturedStreamEvents
  }).addTo(featuredLayerGroup);

  featuredStreamLayers.push(layer);
}

function buildFeaturedFeature(feature, file, sourceType) {
  const sourceName =
    feature.properties?.name ||
    feature.properties?.GNIS_Name ||
    feature.properties?.gnis_name ||
    feature.properties?.GNIS_NAME ||
    '';

  if (!sourceName) return null;

  const matches = featuredWaters
    .filter(water =>
      sourceName.toLowerCase().includes(String(water.match || '').toLowerCase()) &&
      featureMatchesBounds(feature, water.bounds)
    )
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const match = matches[0];

  if (!match) return null;

  const useOsmSupplement = match.useOsmSupplement === true;

  if (
    sourceType === 'osm' &&
    matchedFeaturedWaterIds.has(match.id) &&
    !useOsmSupplement
  ) {
    return null;
  }

  if (sourceType === 'nhd') {
    matchedFeaturedWaterIds.add(match.id);
  }

  return {
    ...feature,
    properties: {
      ...feature.properties,
      ...match,
      sourceName,
      sourceLayer: sourceType,
      sourceLabel: file.label
    }
  };
}

function bindFeaturedStreamEvents(feature, layer) {
  layer.on('click', () => {
    selectedStream = feature.properties;
    renderStreamCard(selectedStream);
    layer.bringToFront();
  });

  layer.on('mouseover', () => layer.setStyle({ weight: 5, opacity: 0.95 }));
  layer.on('mouseout', () => layer.setStyle(styleStream(feature)));

  layer.bindTooltip(feature.properties.name || feature.properties.sourceName, {
    permanent: false,
    direction: 'top',
    sticky: true,
    className: 'stream-tooltip'
  });
}

function styleStream(feature) {
  const mode = modes[currentModeIndex].key;
  const speciesKey = feature.properties[mode];

  return {
    color: speciesColors[speciesKey]?.color || speciesColors.unknown.color,
    weight: 4,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round'
  };
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
    <h2>${escapeHtml(stream.name)}</h2>
    <p>${escapeHtml(stream.note || '')}</p>
    <dl>
      <dt>Layer</dt><dd>${escapeHtml(modeLabel(mode))}</dd>
      <dt>Shown as</dt><dd>${escapeHtml(activeLabel)}</dd>
      <dt>Mapped name</dt><dd>${escapeHtml(stream.sourceName || stream.name)}</dd>
      <dt>Basin</dt><dd>${escapeHtml(stream.basin || 'Unknown')}</dd>
      <dt>State</dt><dd>${escapeHtml(stream.state || 'Unknown')}</dd>
      <dt>Confidence</dt><dd>${escapeHtml(stream.confidence || 'Prototype / needs review')}</dd>
      <dt>Geometry status</dt><dd>${escapeHtml(geometryStatusLabel(stream))}</dd>
      <dt>Geometry source</dt><dd>${escapeHtml(stream.sourceLabel || stream.geometrySource || 'Unknown')}</dd>
      <dt>Trout source</dt><dd>${escapeHtml(stream.troutSource || 'Unknown')}</dd>
    </dl>
  `;
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

  status.textContent = `Loaded ${loadedHydroFiles.size} of ${hydroFiles.length} reference layers`;
}

function sourceSortOrder(sourceType) {
  if (sourceType === 'nhd') return 1;
  if (sourceType === 'osm') return 2;
  return 3;
}

const slider = document.getElementById('mode-slider');

if (slider) {
  slider.addEventListener('input', event => {
    currentModeIndex = Number(event.target.value);
    renderMode();
    renderLegend();

    featuredStreamLayers.forEach(layer => layer.setStyle(styleStream));

    if (selectedStream) {
      renderStreamCard(selectedStream);
    }
  });
}

document.querySelectorAll('[data-layer-toggle]').forEach(toggle => {
  toggle.addEventListener('change', event => {
    const layerType = event.target.dataset.layerToggle;
    const layer = hydroLayerGroups[layerType];

    if (!layer) return;

    if (event.target.checked) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }
  });
});

map.on('moveend zoomend', () => {
  loadVisibleScopes();
});

document.querySelectorAll('[data-view-jump]').forEach(button => {
  button.addEventListener('click', async event => {
    const viewKey = event.currentTarget.dataset.viewJump;
    const bounds = watershedViews[viewKey];

    await loadHydroFilesForScope(viewKey);

    if (!bounds) return;

    map.fitBounds(bounds, {
      padding: [40, 40]
    });

    await loadVisibleScopes();
  });
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
const deepTimeVisual = document.querySelector(".deep-time-visual");
const deepTimeCaption = document.querySelector("#deepTimeCaption");
const deepTimeScenes = document.querySelectorAll(".deep-time-scene");

const deepTimeCaptions = {
  coast:
    "Ancestral cutthroat begin on the Pacific side, moving through cold coastal streams and river corridors.",
  inland:
    "Over generations, trout expand inland through connected western rivers before modern basin boundaries fully separate them.",
  ice:
    "Glaciers, ice dams, and huge pluvial lakes reshape the West, creating temporary pathways and new barriers.",
  flood:
    "Catastrophic floods and shifting headwaters rearrange the map, connecting some waters while tearing others apart.",
  isolation:
    "As basins separate, trout become isolated in different watersheds and begin following their own evolutionary paths.",
  modern:
    "Modern cutthroat lineages are the living record of those old waters, isolated basins, floods, and headwater connections."
};

if (deepTimeVisual && deepTimeScenes.length) {
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
