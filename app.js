const map = L.map("map", {
  zoomControl: true,
});

const baseMap = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  subdomains: "abcd",
  maxZoom: 20,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
});

baseMap.addTo(map);
map.setView([20.6, -99.9], 8);

const lineLayer = L.layerGroup().addTo(map);
const pointLayer = L.layerGroup().addTo(map);
const polygonLayer = L.layerGroup().addTo(map);
const searchableFeatures = [];

const counts = {
  lines: 0,
  points: 0,
  polygons: 0,
};

function updateCounts() {
  document.getElementById("lineCount").textContent = `Lineas: ${counts.lines}`;
  document.getElementById("pointCount").textContent = `Puntos: ${counts.points}`;
  document.getElementById("polygonCount").textContent = `Poligonos: ${counts.polygons}`;
}

function updateUrlState() {
  const center = map.getCenter();
  const params = new URLSearchParams(window.location.search);

  params.set("z", String(map.getZoom()));
  params.set("lat", center.lat.toFixed(5));
  params.set("lng", center.lng.toFixed(5));
  params.set("line", map.hasLayer(lineLayer) ? "1" : "0");
  params.set("points", map.hasLayer(pointLayer) ? "1" : "0");
  params.set("poly", map.hasLayer(polygonLayer) ? "1" : "0");

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  history.replaceState(null, "", newUrl);
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  const z = Number(params.get("z"));
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  if (Number.isFinite(z) && Number.isFinite(lat) && Number.isFinite(lng)) {
    map.setView([lat, lng], z);
  }
}

function cleanName(name) {
  if (!name || typeof name !== "string") {
    return "Elemento sin nombre";
  }

  const removedKmlCodes = name.replace(/\\[^;]+;/g, " ");
  const oneLine = removedKmlCodes.replace(/[\n\r\t]+/g, " ");
  return oneLine.replace(/\s+/g, " ").trim();
}

function popupContent(feature) {
  const rawName = feature?.properties?.name || feature?.properties?.Name || "";
  const name = cleanName(rawName);

  const extras = [];
  for (const [key, value] of Object.entries(feature?.properties || {})) {
    if (["name", "Name", "styleUrl", "styleHash", "styleMapHash"].includes(key)) {
      continue;
    }

    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }

    extras.push(`<tr><th>${key}</th><td>${String(value)}</td></tr>`);
  }

  const details = extras.length
    ? `<table class="popup-table"><tbody>${extras.join("")}</tbody></table>`
    : "";

  return `<div class="popup-wrap"><strong>${name}</strong>${details}</div>`;
}

function createFeatureLayer(feature, latlng) {
  const geometryType = feature?.geometry?.type;

  if (geometryType === "Point") {
    counts.points += 1;
    return L.circleMarker(latlng, {
      radius: 7,
      color: "#ffffff",
      weight: 2,
      fillColor: "#1f675e",
      fillOpacity: 0.95,
      className: "pulse-point",
    });
  }

  return L.marker(latlng);
}

function styleByGeometry(feature) {
  const type = feature?.geometry?.type;

  if (type === "LineString" || type === "MultiLineString") {
    return {
      color: "#db3e3e",
      weight: 3,
      opacity: 0.95,
    };
  }

  if (type === "Polygon" || type === "MultiPolygon") {
    return {
      color: "#8e9500",
      weight: 1,
      fillColor: "#dce614",
      fillOpacity: 0.78,
    };
  }

  return {
    color: "#5e6a73",
    weight: 2,
  };
}

function addFeatureToGroup(layer) {
  const feature = layer.feature || {};
  const type = feature?.geometry?.type;
  const cleanFeatureName = cleanName(feature?.properties?.name || feature?.properties?.Name || "");

  if (type === "LineString" || type === "MultiLineString") {
    counts.lines += 1;
    lineLayer.addLayer(layer);
    searchableFeatures.push({
      name: cleanFeatureName || "Trazo sin nombre",
      layer,
    });
    return;
  }

  if (type === "Polygon" || type === "MultiPolygon") {
    counts.polygons += 1;
    polygonLayer.addLayer(layer);
    searchableFeatures.push({
      name: cleanFeatureName || "Poligono sin nombre",
      layer,
    });
    return;
  }

  if (type === "Point") {
    pointLayer.addLayer(layer);
    searchableFeatures.push({
      name: cleanFeatureName || "Punto sin nombre",
      layer,
    });
  }
}

function syncLegend() {
  const lineVisible = map.hasLayer(lineLayer);
  const pointVisible = map.hasLayer(pointLayer);
  const polyVisible = map.hasLayer(polygonLayer);

  document.querySelector('[data-layer="line"]').classList.toggle("is-off", !lineVisible);
  document.querySelector('[data-layer="point"]').classList.toggle("is-off", !pointVisible);
  document.querySelector('[data-layer="polygon"]').classList.toggle("is-off", !polyVisible);
}

function setLayerVisibility(line, points, polygons) {
  if (line) {
    lineLayer.addTo(map);
  } else {
    map.removeLayer(lineLayer);
  }

  if (points) {
    pointLayer.addTo(map);
  } else {
    map.removeLayer(pointLayer);
  }

  if (polygons) {
    polygonLayer.addTo(map);
  } else {
    map.removeLayer(polygonLayer);
  }

  document.getElementById("toggleLine").checked = line;
  document.getElementById("togglePoints").checked = points;
  document.getElementById("togglePolygons").checked = polygons;

  syncLegend();
  updateUrlState();
}

function wireToggles() {
  const toggleLine = document.getElementById("toggleLine");
  const togglePoints = document.getElementById("togglePoints");
  const togglePolygons = document.getElementById("togglePolygons");

  toggleLine.addEventListener("change", (event) => {
    setLayerVisibility(event.target.checked, togglePoints.checked, togglePolygons.checked);
  });

  togglePoints.addEventListener("change", (event) => {
    setLayerVisibility(toggleLine.checked, event.target.checked, togglePolygons.checked);
  });

  togglePolygons.addEventListener("change", (event) => {
    setLayerVisibility(toggleLine.checked, togglePoints.checked, event.target.checked);
  });

  document.getElementById("toggleAllOn").addEventListener("click", () => {
    setLayerVisibility(true, true, true);
  });

  document.getElementById("toggleAllOff").addEventListener("click", () => {
    setLayerVisibility(false, false, false);
  });

  syncLegend();
}

function layerToLatLng(layer) {
  if (layer.getLatLng) {
    return layer.getLatLng();
  }

  if (layer.getBounds) {
    return layer.getBounds().getCenter();
  }

  return null;
}

function focusLayer(layer) {
  const center = layerToLatLng(layer);

  if (center) {
    map.panTo(center, { animate: true, duration: 0.5 });
    map.setZoom(Math.max(map.getZoom(), 14));
  }

  if (layer.openPopup) {
    layer.openPopup();
  }

  if (layer.getBounds) {
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.4));
    }
  }
}

function wireSearch() {
  const input = document.getElementById("featureSearch");
  const clear = document.getElementById("clearSearch");
  const results = document.getElementById("searchResults");

  function renderResults(query) {
    const normalized = query.trim().toLowerCase();
    results.innerHTML = "";

    if (!normalized) {
      return;
    }

    const matches = searchableFeatures
      .filter((item) => item.name.toLowerCase().includes(normalized))
      .slice(0, 12);

    for (const match of matches) {
      const li = document.createElement("li");
      li.textContent = match.name;
      li.addEventListener("click", () => {
        focusLayer(match.layer);
      });
      results.appendChild(li);
    }
  }

  input.addEventListener("input", () => {
    renderResults(input.value);
  });

  clear.addEventListener("click", () => {
    input.value = "";
    results.innerHTML = "";
    input.focus();
  });
}

function wireMobilePanel() {
  const panel = document.getElementById("sidebar");
  const button = document.getElementById("mobileToggle");

  button.addEventListener("click", () => {
    panel.classList.toggle("is-hidden");
  });
}

function loadKml() {
  const source = omnivore.kml("./Estaciones y Edificios Adicionales.kml", null, L.geoJson(null, {
    style: styleByGeometry,
    pointToLayer: createFeatureLayer,
    onEachFeature: (feature, layer) => {
      layer.bindPopup(popupContent(feature));
    },
  }));

  source.on("ready", () => {
    source.eachLayer((layer) => addFeatureToGroup(layer));

    updateCounts();
    wireToggles();
    wireSearch();

    const params = new URLSearchParams(window.location.search);
    const lineOn = params.get("line") !== "0";
    const pointsOn = params.get("points") !== "0";
    const polyOn = params.get("poly") !== "0";
    setLayerVisibility(lineOn, pointsOn, polyOn);

    const bounds = source.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.08));
    }

    applyUrlState();

    map.on("moveend", updateUrlState);
    map.on("zoomend", updateUrlState);
    updateUrlState();
  });

  source.on("error", () => {
    alert("No se pudo cargar el archivo KML. Usa un servidor local, por ejemplo: python3 -m http.server");
  });
}

wireMobilePanel();
loadKml();
