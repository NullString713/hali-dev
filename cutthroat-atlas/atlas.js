const speciesColors = {
  greenback: { label: 'Greenback Cutthroat', color: '#45b36b' },
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

const streams = [
  {
    name: 'Cache la Poudre Headwaters',
    basin: 'South Platte / Cache la Poudre',
    state: 'Colorado',
    historic: 'greenback',
    current: 'introduced',
    recovery: 'recoveryHigh',
    confidence: 'Prototype / generalized',
    note: 'Representative Front Range headwater stream. Real version should generalize sensitive native population details.',
    coords: [[40.70, -105.88], [40.67, -105.70], [40.63, -105.50], [40.59, -105.32]]
  },
  {
    name: 'Upper Arkansas Tributary',
    basin: 'Arkansas River',
    state: 'Colorado',
    historic: 'greenback',
    current: 'introduced',
    recovery: 'recoveryLow',
    confidence: 'Prototype / generalized',
    note: 'A mock line representing how historic native range can differ from modern trout communities.',
    coords: [[39.22, -106.45], [39.12, -106.25], [39.02, -106.08], [38.93, -105.92]]
  },
  {
    name: 'Colorado River Headwater',
    basin: 'Colorado River',
    state: 'Colorado',
    historic: 'coloradoRiver',
    current: 'coloradoRiver',
    recovery: 'recoveryStable',
    confidence: 'Prototype / generalized',
    note: 'Representative western slope drainage for Colorado River cutthroat storytelling.',
    coords: [[40.38, -106.72], [40.20, -106.58], [40.05, -106.43], [39.90, -106.24]]
  },
  {
    name: 'Gunnison Basin Creek',
    basin: 'Gunnison / Colorado River',
    state: 'Colorado',
    historic: 'coloradoRiver',
    current: 'introduced',
    recovery: 'recoveryHigh',
    confidence: 'Prototype / generalized',
    note: 'A mock conservation-focused western slope stream segment.',
    coords: [[38.92, -107.54], [38.80, -107.35], [38.70, -107.10], [38.62, -106.92]]
  },
  {
    name: 'San Luis Valley Creek',
    basin: 'Rio Grande',
    state: 'Colorado',
    historic: 'rioGrande',
    current: 'rioGrande',
    recovery: 'recoveryStable',
    confidence: 'Prototype / generalized',
    note: 'Representative Rio Grande cutthroat stream. Real data should include source and confidence fields.',
    coords: [[37.72, -106.85], [37.62, -106.65], [37.50, -106.42], [37.38, -106.18]]
  },
  {
    name: 'Twin Lakes Historic Water',
    basin: 'Arkansas / Twin Lakes',
    state: 'Colorado',
    historic: 'yellowfin',
    current: 'introduced',
    recovery: 'recoveryLow',
    confidence: 'Prototype / generalized',
    note: 'A placeholder for telling the yellowfin cutthroat story without implying current presence.',
    coords: [[39.15, -106.55], [39.10, -106.48], [39.06, -106.42]]
  }
];

let selectedStream = null;
let currentModeIndex = 0;

const map = L.map('map', {
  zoomControl: true,
  scrollWheelZoom: true
}).setView([39.25, -106.1], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 13,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const streamLayer = L.geoJSON(streamsToGeoJson(), {
  style: styleStream,
  onEachFeature: (feature, layer) => {
    layer.on('click', () => {
      selectedStream = feature.properties;
      renderStreamCard(selectedStream);
      layer.bringToFront();
    });
    layer.on('mouseover', () => layer.setStyle({ weight: 8 }));
    layer.on('mouseout', () => streamLayer.resetStyle(layer));
  }
}).addTo(map);

renderLegend();
renderMode();

const slider = document.getElementById('mode-slider');
slider.addEventListener('input', (event) => {
  currentModeIndex = Number(event.target.value);
  renderMode();
  streamLayer.setStyle(styleStream);
  if (selectedStream) renderStreamCard(selectedStream);
});

function streamsToGeoJson() {
  return {
    type: 'FeatureCollection',
    features: streams.map(stream => ({
      type: 'Feature',
      properties: stream,
      geometry: {
        type: 'LineString',
        coordinates: stream.coords.map(([lat, lng]) => [lng, lat])
      }
    }))
  };
}

function styleStream(feature) {
  const mode = modes[currentModeIndex].key;
  const speciesKey = feature.properties[mode];
  return {
    color: speciesColors[speciesKey]?.color || speciesColors.unknown.color,
    weight: 7,
    opacity: 1,
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
      <dt>Basin</dt><dd>${escapeHtml(stream.basin)}</dd>
      <dt>State</dt><dd>${escapeHtml(stream.state)}</dd>
      <dt>Confidence</dt><dd>${escapeHtml(stream.confidence)}</dd>
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
