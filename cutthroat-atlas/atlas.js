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

const hydroFiles = [
  {
    scope: 'colorado',
    path: './data/geojson/nhd/colorado_v0_web/waterbodies_colorado_web_v0.geojson',
    type: 'nhd-colorado-waterbodies',
    sourceType: 'lakes',
    label: 'USGS NHD waterbodies — Colorado lakes and reservoirs',
    style: {
      color: '#38bdf8',
      weight: 0.8,
      opacity: 0.75,
      fillColor: '#38bdf8',
      fillOpacity: 0.22
    }
  },
  {
    scope: 'colorado',
    path: './data/geojson/nhd/colorado_v0_web/waterareas_stream_polygons_colorado_web_v0.geojson',
    type: 'nhd-colorado-stream-polygons',
    sourceType: 'lakes',
    label: 'USGS NHD stream polygons — Colorado',
    style: {
      color: '#38bdf8',
      weight: 0.6,
      opacity: 0.55,
      fillColor: '#38bdf8',
      fillOpacity: 0.18
    }
  },
  {
    scope: 'colorado',
    path: './data/geojson/nhd/colorado_v0_web/streams_colorado_web_v1_upload_min.geojson',
    type: 'nhd-colorado-streams',
    sourceType: 'nhd',
    label: 'USGS NHD named streams — Colorado',
    style: {
      color: '#60a5fa',
      weight: 1.1,
      opacity: 0.42
    }
    },
    {
    scope: 'colorado',
    path: './data/geojson/interpreted/colorado_cutthroat_featured_v0.geojson',
    type: 'colorado-cutthroat-featured',
    sourceType: 'interpreted',
    label: 'Colorado cutthroat interpreted waters — prototype'
    },
    {
    scope: 'colorado',
    path: './data/geojson/interpreted/colorado_cutthroat_huc8_lineage_v1.geojson',
    type: 'colorado-cutthroat-huc8-lineage',
    sourceType: 'lineage-polygons',
    label: 'Colorado cutthroat HUC8 lineage context — prototype'
    },
    {
    scope: 'colorado',
    path: './data/geojson/interpreted/colorado_cutthroat_huc8_stream_context_named_web_1km_v1.geojson',
    type: 'colorado-cutthroat-huc8-stream-context',
    sourceType: 'lineage-stream-context',
    label: 'Colorado cutthroat HUC8 stream context — 1 km prototype'
    }
  // Optional later toggle layer.
  // Do not enable by default unless your loader supports defaultVisible: false.
  /*
  {
    scope: 'colorado',
    path: './data/geojson/nhd/colorado_v0_web/human_altered_hydrology_colorado_web_v0.geojson',
    type: 'nhd-colorado-human-altered-hydrology',
    sourceType: 'nhd-human',
    label: 'USGS NHD human-altered hydrology — Colorado canals, ditches, pipelines',
    style: {
      color: '#f59e0b',
      weight: 1,
      opacity: 0.55,
      dashArray: '4 4'
    }
  }
  */
];

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
  scrollWheelZoom: true,
  preferCanvas: true
}).setView([39.0, -105.55], 7);

function getStreamWeight(feature) {
  const zoom = map.getZoom();
  const props = feature.properties || {};

  const hasName = Boolean(
    props.name ||
    props.gnis_name ||
    props.GNIS_Name ||
    props.GNIS_NAME
  );

  const isRecovery =
    props.recovery === 'recoveryHigh' ||
    props.recovery === 'recovery';

  if (isRecovery) {
    if (zoom <= 8) return 1.8;
    if (zoom <= 10) return 2.3;
    if (zoom <= 12) return 2.8;
    return 3.2;
  }

  if (hasName) {
    if (zoom <= 8) return 0.7;
    if (zoom <= 10) return 1.0;
    if (zoom <= 12) return 1.4;
    return 1.8;
  }

  if (zoom <= 8) return 0.2;
  if (zoom <= 10) return 0.35;
  if (zoom <= 12) return 0.65;
  return 1.0;
}

function getStreamOpacity(feature) {
  const zoom = map.getZoom();
  const props = feature.properties || {};

  const hasName = Boolean(
    props.name ||
    props.gnis_name ||
    props.GNIS_Name ||
    props.GNIS_NAME
  );

  const isRecovery =
    props.recovery === 'recoveryHigh' ||
    props.recovery === 'recovery';

  if (isRecovery) return 0.9;

  if (hasName) {
    if (zoom <= 8) return 0.45;
    if (zoom <= 10) return 0.55;
    return 0.7;
  }

  if (zoom <= 8) return 0.12;
  if (zoom <= 10) return 0.22;
  if (zoom <= 12) return 0.38;
  return 0.55;
}

function getStreamStyle(feature) {
  const props = feature.properties || {};

  const isRecovery =
    props.recovery === 'recoveryHigh' ||
    props.recovery === 'recovery';

  return {
    color: isRecovery ? '#22c55e' : '#38bdf8',
    weight: getStreamWeight(feature),
    opacity: getStreamOpacity(feature),
    lineCap: 'round',
    lineJoin: 'round'
  };
}
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
  .then(data => {
    featuredWaters = data;
  })
  .catch(error => {
    console.error('Could not load featured waters:', error);
  })
  .finally(async () => {
    await loadHydroFilesForScope(DEFAULT_SCOPE);

    if (DEFAULT_SCOPE === 'colorado') {
      map.fitBounds(watershedViews.colorado, {
        padding: [24, 24]
      });
    }
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

    // Prebuilt interpreted Colorado cutthroat layer.
    // This becomes the clickable species-colored layer.
    if (sourceType === 'lineage-polygons') {
  addLineagePolygonLayer(data, file);
  return;
    }
    
    if (sourceType === 'lineage-stream-context') {
      addLineageStreamContextLayer(data, file);
      return;
    }
    
    if (sourceType === 'interpreted') {
      addInterpretedFeaturedLayer(data, file);
      return;
    }

    // Normal blue/reference hydro.
    addReferenceLayer(data, file, sourceType);

    // Do not build featured layers from statewide NHD anymore.
    // That was causing the broken fragmented green overlays.
    if (sourceType === 'osm') {
      addFeaturedLayer(data, file, sourceType);
    }
  } catch (error) {
    console.error(`Could not load ${file.label}:`, error);
  }
}
function isPointGeometry(feature) {
  const type = feature.geometry?.type || '';
  return type === 'Point' || type === 'MultiPoint';
}

function isLineGeometry(feature) {
  const type = feature.geometry?.type || '';
  return type === 'LineString' || type === 'MultiLineString';
}

function addReferenceLayer(data, file, sourceType) {
  const hydroLayer = L.geoJSON(data, {
    filter: (feature) => !isPointGeometry(feature),
    pointToLayer: () => null,
    style: (feature) => {
      const zoom = map.getZoom();
      const props = feature.properties || {};
      const geometryType = feature.geometry?.type || '';

      const isPolygon =
        geometryType.includes('Polygon');

      const hasName = Boolean(
        props.name ||
        props.gnis_name ||
        props.GNIS_Name ||
        props.GNIS_NAME
      );

      const isHighlight =
        file.style?.color === '#22c55e' ||
        file.style?.color === '#35d07f' ||
        file.style?.weight >= 3;

      // Keep lakes / waterbody polygons filled and readable
      if (isPolygon || sourceType === 'lakes') {
        return {
          color: file.style?.color || '#3b9fc6',
          weight: file.style?.weight || 1.2,
          opacity: file.style?.opacity || 0.65,
          fillColor: file.style?.fillColor || file.style?.color || '#3b9fc6',
          fillOpacity: file.style?.fillOpacity ?? 0.18,
          lineCap: 'round',
          lineJoin: 'round'
        };
      }

      // Keep important highlighted/recovery lines stronger
        if (isHighlight) {
          return {
            color: file.style?.color || '#22c55e',
            weight: zoom <= 8 ? 1.6 : zoom <= 10 ? 2.1 : zoom <= 12 ? 2.6 : 3,
            opacity: zoom <= 8 ? 0.8 : 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          };
        }

      // Fade normal stream spaghetti way down when zoomed out
      return {
        color: file.style?.color || '#38bdf8',
        weight: zoom <= 8 ? 0.18 : zoom <= 10 ? 0.35 : zoom <= 12 ? 0.6 : 0.9,
        opacity: hasName
          ? zoom <= 8 ? 0.22 : zoom <= 10 ? 0.38 : 0.55
          : zoom <= 8 ? 0.08 : zoom <= 10 ? 0.16 : zoom <= 12 ? 0.28 : 0.42,
        fillColor: file.style?.fillColor || file.style?.color || '#3b9fc6',
        fillOpacity: file.style?.fillOpacity ?? 0.16,
        lineCap: 'round',
        lineJoin: 'round'
      };
    },
    interactive: false,
    smoothFactor: 1.5
  });

  hydroLayer.addTo(hydroLayerGroups[sourceType]);
}

function addInterpretedFeaturedLayer(data, file) {
  const layer = L.geoJSON(data, {
    filter: (feature) => isLineGeometry(feature) && !isPointGeometry(feature),
    style: styleStream,
    onEachFeature: (feature, layer) => {
      feature.properties = {
        ...feature.properties,
        sourceLayer: 'interpreted',
        sourceLabel: file.label
      };

      bindFeaturedStreamEvents(feature, layer);
    },
    smoothFactor: 1.5
  }).addTo(featuredLayerGroup);

  featuredStreamLayers.push(layer);
}
function addFeaturedLayer(data, file, sourceType) {
  const featuredStreams = {
    type: 'FeatureCollection',
    features: data.features
    .filter(feature => !isPointGeometry(feature))
    .map(feature => buildFeaturedFeature(feature, file, sourceType))
    .filter(Boolean)
  };

  if (featuredStreams.features.length === 0) return;

  const layer = L.geoJSON(featuredStreams, {
  filter: (feature) => !isPointGeometry(feature),
  pointToLayer: () => null,
  style: styleStream,
  onEachFeature: bindFeaturedStreamEvents,
  smoothFactor: 1.5
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

map.on('zoomend', () => {
  Object.values(hydroLayerGroups).forEach((layerGroup) => {
    layerGroup.eachLayer((layer) => {
      if (layer.setStyle && layer.options?.style) {
        layer.setStyle(layer.options.style);
      }
    });
  });

  featuredStreamLayers.forEach((layer) => {
    if (layer.setStyle) {
      layer.setStyle(styleStream);
    }
  });
});

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
  const zoom = map.getZoom();

  return {
    color: speciesColors[speciesKey]?.color || speciesColors.unknown.color,
    weight: zoom <= 8 ? 0.9 : zoom <= 10 ? 1.2 : zoom <= 12 ? 1.6 : 2.1,
    opacity: zoom <= 8 ? 0.48 : zoom <= 10 ? 0.6 : 0.75,
    lineCap: 'round',
    lineJoin: 'round'
  };
}
function getLineageColor(feature) {
  const key = feature.properties?.lineageKey || feature.properties?.historic;
  return speciesColors[key]?.color || '#64748b';
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

function styleLineageStreamContext(feature) {
  const color = getLineageColor(feature);

  return {
    color,
    weight: 1.15,
    opacity: 0.45,
    interactive: false
  };
}

function addLineagePolygonLayer(data, file) {
  const layer = L.geoJSON(data, {
    filter: (feature) => {
      const type = feature.geometry?.type || '';
      return type === 'Polygon' || type === 'MultiPolygon';
    },
    style: styleLineagePolygon,
    interactive: false,
    smoothFactor: 1.5
  }).addTo(map);

  layer.eachLayer((l) => {
    if (l.bringToBack) l.bringToBack();
  });
}

function addLineageStreamContextLayer(data, file) {
  const layer = L.geoJSON(data, {
    filter: (feature) => isLineGeometry(feature) && !isPointGeometry(feature),
    style: styleLineageStreamContext,
    interactive: false,
    smoothFactor: 1.5
  }).addTo(map);

  layer.eachLayer((l) => {
    if (l.bringToBack) l.bringToBack();
  });
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
  if (sourceType === 'lakes') return 1;
  if (sourceType === 'lineage-polygons') return 2;
  if (sourceType === 'nhd') return 3;
  if (sourceType === 'lineage-stream-context') return 4;
  if (sourceType === 'interpreted') return 5;
  if (sourceType === 'osm') return 6;
  return 7;
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
