const speciesColors = {
  greenback: { label: 'Greenback Cutthroat', color: '#16a34a' },
  coloradoRiver: { label: 'Colorado River Cutthroat', color: '#d8563a' },
  rioGrande: { label: 'Rio Grande Cutthroat', color: '#8f5fd7' },
  yellowfin: { label: 'Yellowfin Cutthroat', color: '#f1c84b' },
  bonneville: { label: 'Bonneville Cutthroat', color: '#d79c45' },
  lahontan: { label: 'Lahontan Cutthroat', color: '#5d8fe8' },
  introduced: { label: 'Introduced Trout / Mixed', color: '#9aa4a6' },
  unknown: { label: 'Unknown / Generalized', color: '#6fb7d8' },
  recoveryHigh: { label: 'Recovery / Sensitive', color: '#f08f3e' },
  recoveryStable: { label: 'Stable / Managed', color: '#66c2a5' },
  recoveryLow: { label: 'Extirpated / Uncertain', color: '#b7b7b7' }
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
let featuredWaters = [];
let loadedHydroFileCount = 0;
const hydroFiles = [
  {
    path: './data/geojson/osm/cache-la-poudre-natural-streams.geojson',
    type: 'osm',
    label: 'Cache la Poudre natural streams',
    style: {
      color: '#3b9fc6',
      weight: 1.6,
      opacity: 0.55
    }
  },
    {
    path: './data/geojson/nhd/poudre-named-flowlines.geojson',
    type: 'nhd',
    label: 'USGS NHD named flowlines — Cache la Poudre',
    style: {
    color: '#8b9cff',
    weight: 1.2,
    opacity: 0.32
  }
}
];
const interpretedFiles = [
  {
    path: './data/geojson/interpreted/poudre-recovery-context.geojson',
    type: 'featured',
    label: 'Poudre recovery context'
  }
];

let featuredStreamLayer;
let selectedStream = null;
let currentModeIndex = 0;

const hydroLayerGroups = {};
const featuredLayerGroup = L.layerGroup();

const map = L.map('map', {
  zoomControl: true,
  scrollWheelZoom: true
}).setView([40.72, -105.72], 10);

featuredLayerGroup.addTo(map);
hydroLayerGroups.featured = featuredLayerGroup;

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd'
}).addTo(map);

fetch('./data/waters/index.json')
  .then(response => response.json())
  .then(data => {featuredWaters = data;
    loadHydroFiles();
  })
  .catch(error => {
    console.error('Could not load featured waters:', error);
  });

function loadHydroFiles() {
  hydroFiles.forEach(file => {
    fetch(file.path)
      .then(response => response.json())
      .then(data => {
        // Background reference stream network
        const hydroLayer = L.geoJSON(data, {
          style: {
            color: file.style?.color || '#3b9fc6',
            weight: file.style?.weight || 1.6,
            opacity: file.style?.opacity || 0.65,
            lineCap: 'round',
            lineJoin: 'round'
          },
          interactive: false
        }).addTo(map);

        hydroLayerGroups[file.type] = hydroLayer;

        const toggle = document.querySelector(`[data-layer-toggle="${file.type}"]`);

        if (toggle && !toggle.checked) {
          map.removeLayer(hydroLayer);
        }

        loadedHydroFileCount += 1;
        updateDataLoadStatus();

        if (file.type !== 'nhd') return;

        // Featured clickable trout layer from cleaned NHD named flowlines
        const featuredStreams = {
          type: 'FeatureCollection',
          features: data.features
            .map(feature => {
              const sourceName =
                feature.properties?.name ||
                feature.properties?.GNIS_Name ||
                feature.properties?.gnis_name ||
                feature.properties?.GNIS_NAME ||
                '';

              const matches = featuredWaters
                .filter(water =>
                  sourceName.toLowerCase().includes(water.match) &&
                  featureMatchesBounds(feature, water.bounds)
                )
                .sort((a, b) => (b.priority || 0) - (a.priority || 0));

              const match = matches[0];

              if (!match) return null;

              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  ...match,
                  sourceName,
                  sourceLayer: file.type,
                  sourceLabel: file.label
                }
              };
            })
            .filter(Boolean)
        };

        featuredStreamLayer = L.geoJSON(featuredStreams, {
          style: styleStream,
          onEachFeature: (feature, layer) => {
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
        }).addTo(featuredLayerGroup);
      })
      .catch(error => {
        console.error(`Could not load ${file.label}:`, error);
      });
  });
}
function loadInterpretedFiles() {
  interpretedFiles.forEach(file => {
    fetch(file.path)
      .then(response => response.json())
      .then(data => {
        const interpretedLayer = L.geoJSON(data, {
          style: styleStream,
          onEachFeature: (feature, layer) => {
            layer.on('click', () => {
              selectedStream = feature.properties;
              renderStreamCard(selectedStream);
              layer.bringToFront();
            });

            layer.on('mouseover', () => layer.setStyle({ weight: 5, opacity: 0.95 }));
            layer.on('mouseout', () => layer.setStyle(styleStream(feature)));

            layer.bindTooltip(feature.properties.name || file.label, {
              permanent: false,
              direction: 'top',
              sticky: true,
              className: 'stream-tooltip'
            });
          }
        }).addTo(featuredLayerGroup);
      })
      .catch(error => {
        console.error(`Could not load ${file.label}:`, error);
      });
  });
}
renderLegend();
renderMode();
updateDataLoadStatus();

const slider = document.getElementById('mode-slider');
slider.addEventListener('input', (event) => {
  currentModeIndex = Number(event.target.value);
  renderMode();

  if (featuredStreamLayer) {
    featuredStreamLayer.setStyle(styleStream);
  }

  if (selectedStream) renderStreamCard(selectedStream);
});

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
  const legendItems = [
    'greenback',
    'coloradoRiver',
    'rioGrande',
    'yellowfin',
    'bonneville',
    'lahontan',
    'introduced',
    'unknown',
    'recoveryHigh',
    'recoveryStable',
    'recoveryLow'
  ];

  const list = document.getElementById('legend-list');
  list.innerHTML = legendItems.map(key => `
    <div class="legend-row">
      <span class="swatch" style="background: ${speciesColors[key].color}"></span>
      <span>${speciesColors[key].label}</span>
    </div>
  `).join('');
}

function renderMode() {
  document.getElementById('mode-description').textContent = modes[currentModeIndex].description;
}

function renderStreamCard(stream) {
  const mode = modes[currentModeIndex].key;
  const activeKey = stream[mode];
  const activeLabel = speciesColors[activeKey]?.label || 'Unknown';
  const card = document.getElementById('stream-card');

   card.innerHTML = `
    <p class="eyebrow">Selected water</p>
    <h2>${escapeHtml(stream.name)}</h2>
    <p>${escapeHtml(stream.note)}</p>
    <dl>
      <dt>Layer</dt><dd>${modeLabel(mode)}</dd>
      <dt>Shown as</dt><dd>${activeLabel}</dd>
      <dt>Mapped name</dt><dd>${escapeHtml(stream.sourceName || stream.name)}</dd>
      <dt>Basin</dt><dd>${escapeHtml(stream.basin)}</dd>
      <dt>State</dt><dd>${escapeHtml(stream.state)}</dd>
      <dt>Confidence</dt><dd>${escapeHtml(stream.confidence)}</dd>
      <dt>Geometry status</dt><dd>${escapeHtml(stream.geometryStatus || 'Prototype / review needed')}</dd>
      <dt>Geometry source</dt><dd>${escapeHtml(stream.geometrySource || 'Unknown')}</dd>
      <dt>Trout source</dt><dd>${escapeHtml(stream.troutSource || 'Unknown')}</dd>
    </dl>
  `;
}

function modeLabel(mode) {
  if (mode === 'historic') return 'Historic native';
  if (mode === 'current') return 'Current likely';
  return 'Recovery status';
}

function featureMatchesBounds(feature, bounds) {
  if (!bounds) return true;

  const coordinates = flattenCoordinates(feature.geometry.coordinates);

  return coordinates.some(([lng, lat]) =>
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function flattenCoordinates(coordinates) {
  if (typeof coordinates[0] === 'number') {
    return [coordinates];
  }

  return coordinates.flatMap(flattenCoordinates);
}

function updateDataLoadStatus() {
  const status = document.getElementById('data-load-status');
  if (!status) return;

  status.textContent = `Loaded ${loadedHydroFileCount} of ${hydroFiles.length} reference layers`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
