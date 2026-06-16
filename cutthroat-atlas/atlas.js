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

const hydroFiles = [
  {
    path: './data/cache-la-poudre-natural-streams.geojson',
    type: 'streams',
    label: 'Cache la Poudre natural streams'
  }
];
let featuredStreamLayer;
let selectedStream = null;
let currentModeIndex = 0;

const map = L.map('map', {
  zoomControl: true,
  scrollWheelZoom: true
}).setView([39.25, -106.1], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd'
}).addTo(map);

fetch('./data/waters/index.json')
  .then(response => response.json())
  .then(data => {
    featuredWaters = data;
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
        // Background stream network
        L.geoJSON(data, {
          style: {
            color: '#3b9fc6',
            weight: 1.6,
            opacity: 0.65,
            lineCap: 'round',
            lineJoin: 'round'
          },
          interactive: false
        }).addTo(map);

        // Featured clickable trout layer
        const featuredStreams = {
          type: 'FeatureCollection',
          features: data.features
            .map(feature => {
              const sourceName = feature.properties?.name || '';

             const matches = featuredWaters
            .filter(water => sourceName.toLowerCase().includes(water.match))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

const match = matches[0];

              if (!match) return null;

              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  ...match,
                  sourceName
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
          }
        }).addTo(map);
      })
      .catch(error => {
        console.error(`Could not load ${file.label}:`, error);
      });
  });
}

renderLegend();
renderMode();

const slider = document.getElementById('mode-slider');
slider.addEventListener('input', (event) => {
  currentModeIndex = Number(event.target.value);
  renderMode();

  if (featuredStreamLayer) {
    featuredStreamLayer.setStyle(styleStream);
  }

  if (selectedStream) renderStreamCard(selectedStream);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
