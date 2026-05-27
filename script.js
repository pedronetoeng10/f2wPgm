/**
 * WebGIS Viewer
 * Visualizador com basemaps, camadas GeoJSON e estilos derivados de QMD/QGIS
 */

(function () {
  "use strict";

  // ===========================================================================
  // Configuração geral
  // ===========================================================================

  const BRAZIL_CENTER = [-14.235, -51.9253];
  const BRAZIL_ZOOM = 4;
  const BRASILIA = [-15.793889, -47.882778];

  const DOM = {
    coordsBar: document.getElementById("coords-bar"),
    btnLocate: document.getElementById("btn-locate"),
    btnMeasure: document.getElementById("btn-measure"),
    btnMeasureClear: document.getElementById("btn-measure-clear"),
    btnFullscreen: document.getElementById("btn-fullscreen"),
    measureInfo: document.getElementById("measure-info"),
    measureDistanceEl: document.getElementById("measure-distance"),
    mapContainer: document.getElementById("map"),
    loader: document.getElementById("loader"),
    loaderText: document.getElementById("loader-text"),
    loaderHint: document.getElementById("loader-hint"),
    loaderSpinner: document.getElementById("loader-spinner"),
    loaderRetry: document.getElementById("loader-retry"),
    legendPanel: document.getElementById("legend-panel"),
    serverGuide: document.getElementById("server-guide"),
    serverDetected: document.getElementById("server-detected"),
    serverDetectedLink: document.getElementById("server-detected-link"),
  };

  const LOG = "[WebGIS]";
  const IS_FILE_PROTOCOL = window.location.protocol === "file:";
  const IS_HTTP =
    window.location.protocol === "http:" || window.location.protocol === "https:";
  const LOCALHOST_PORTS = [3000, 8765];

  /** Base da aplicação (localhost, GitHub Pages /f2wPgm/, etc.) */
  function resolveAppBase() {
    let path = window.location.pathname;
    if (path.endsWith("/index.html")) {
      path = path.slice(0, -"/index.html".length);
    } else if (/\.[a-z0-9]+$/i.test((path.split("/").pop() || ""))) {
      path = path.slice(0, path.lastIndexOf("/") + 1);
    }
    if (!path.endsWith("/")) {
      path += "/";
    }
    return window.location.origin + path;
  }

  /** Resolve caminhos relativos à URL atual (compatível com GitHub Pages) */
  function assetUrl(relativePath) {
    const clean = String(relativePath).replace(/^\/+/, "");
    return new URL(clean, resolveAppBase()).href;
  }

  // ===========================================================================
  // Detecção de ambiente e tela de orientação
  // ===========================================================================

  function logEnvironmentStatus() {
    console.info(LOG, "────────────────────────────────");
    console.info(LOG, "Ambiente:", IS_FILE_PROTOCOL ? "file:// (local)" : window.location.origin);
    console.info(LOG, "Base:", resolveAppBase());
    console.info(LOG, "Protocolo:", window.location.protocol);
    console.info(LOG, "Host:", window.location.hostname || "(arquivo local)");
    console.info(LOG, "────────────────────────────────");
  }

  function showServerGuide() {
    document.body.classList.add("is-file-mode");
    if (DOM.serverGuide) DOM.serverGuide.classList.remove("hidden");
    if (DOM.loader) DOM.loader.classList.add("hidden");
    console.warn(LOG, "Modo file:// — camadas não serão carregadas.");
  }

  function hideServerGuide() {
    document.body.classList.remove("is-file-mode");
    if (DOM.serverGuide) DOM.serverGuide.classList.add("hidden");
  }

  function showDetectedServer(url) {
    if (!DOM.serverDetected || !DOM.serverDetectedLink) return;
    DOM.serverDetected.classList.remove("hidden");
    DOM.serverDetectedLink.href = url;
    DOM.serverDetectedLink.textContent = "Abrir " + url;
  }

  async function probeLocalServers() {
    console.info(LOG, "Verificando servidores locais...");
    for (let i = 0; i < LOCALHOST_PORTS.length; i++) {
      const port = LOCALHOST_PORTS[i];
      const url = "http://localhost:" + port;
      try {
        const controller = new AbortController();
        const timer = setTimeout(function () { controller.abort(); }, 2000);
        const res = await fetch(url + "/data/estado.qmd", {
          method: "HEAD",
          mode: "cors",
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          console.info(LOG, "Servidor ativo detectado:", url);
          showDetectedServer(url);
          return url;
        }
      } catch (err) {
        console.info(LOG, "Porta " + port + " indisponível.");
      }
    }
    console.info(LOG, "Nenhum servidor local detectado. Inicie start_server.bat.");
    return null;
  }

  function bindCopyButtons() {
    document.querySelectorAll(".server-guide__copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const text = btn.getAttribute("data-copy") || "";
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "Copiado!";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = btn.getAttribute("data-copy").includes("npm")
              ? "Copiar comando"
              : btn.getAttribute("data-copy").includes("python")
                ? "Copiar comando"
                : "Copiar nome do arquivo";
            btn.classList.remove("copied");
          }, 1800);
        }).catch(function () {
          btn.textContent = "Copie manualmente";
        });
      });
    });
  }

  function getLoadErrorHint() {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "Verifique a pasta data/ e recarregue a página (F5).";
    }
    if (host.endsWith("github.io")) {
      return "Aguarde a publicação no GitHub Pages (1–3 min) e recarregue (F5). Confira se data/ foi enviada ao repositório.";
    }
    return "Use start_server.bat localmente ou acesse https://pedronetoeng10.github.io/f2wPgm/";
  }

  /** Ordem de empilhamento: CAR (base) → Estado (topo) */
  const THEMATIC_LAYERS = [
    {
      id: "car",
      label: "CAR",
      geojson: "data/CAR.geojson",
      qmd: "data/CAR.qmd",
      defaultVisible: true,
      zIndex: 1,
      fallback: {
        color: "#166534",
        weight: 1.4,
        opacity: 0.85,
        fillColor: "#4ade80",
        fillOpacity: 0.32,
      },
      highlight: {
        color: "#14532d",
        weight: 2.5,
        fillOpacity: 0.52,
      },
      lazyPopup: true,
      lightInteraction: true,
      chunkSize: 300,
    },
    {
      id: "estado",
      label: "Estado",
      geojson: "data/estado.geojson",
      qmd: "data/estado.qmd",
      defaultVisible: true,
      fitPriority: true,
      zIndex: 2,
      labelField: "NM_MUN",
      fallback: {
        color: "#1e3a8a",
        weight: 3,
        opacity: 1,
        fillColor: "#3b82f6",
        fillOpacity: 0,
      },
      highlight: {
        color: "#2563eb",
        weight: 4,
        fillOpacity: 0.06,
      },
    },
  ];

  // ===========================================================================
  // Utilitários
  // ===========================================================================

  function setLoader(message, visible) {
    if (message) DOM.loaderText.textContent = message;
    DOM.loader.classList.toggle("hidden", visible === false);
    if (visible !== false) {
      DOM.loader.classList.remove("error");
    }
  }

  function showLoaderError(title, hint, showRetry) {
    DOM.loader.classList.remove("hidden");
    DOM.loader.classList.add("error");
    DOM.loaderText.textContent = title;
    DOM.loaderHint.textContent = hint;
    DOM.loaderHint.classList.remove("hidden");
    DOM.loaderRetry.classList.toggle("hidden", !showRetry);
    if (DOM.loaderSpinner) DOM.loaderSpinner.style.display = "none";
  }

  function resetLoaderUi() {
    DOM.loader.classList.remove("error");
    DOM.loaderHint.classList.add("hidden");
    DOM.loaderRetry.classList.add("hidden");
    if (DOM.loaderSpinner) DOM.loaderSpinner.style.display = "";
  }

  function checkServerEnvironment() {
    if (!IS_HTTP) {
      throw new Error("INVALID_PROTOCOL");
    }
    console.info(LOG, "Servidor HTTP OK:", window.location.origin);
  }

  function formatCoord(value) {
    return Number(value).toFixed(5) + "°";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function qgisColorToCss(colorValue, fallback) {
    if (!colorValue) return fallback;
    const parts = String(colorValue).split(",").map(Number);
    if (parts.length >= 3 && parts.every(function (n) { return !isNaN(n); })) {
      const alpha = parts.length >= 4 ? parts[3] / 255 : 1;
      return "rgba(" + parts[0] + "," + parts[1] + "," + parts[2] + "," + alpha + ")";
    }
    if (/^#/.test(colorValue) || /^rgb/.test(colorValue)) return colorValue;
    return fallback;
  }

  function cssColorToHex(color) {
    if (!color) return "#3388ff";
    if (color.startsWith("#")) return color;
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return "#3388ff";
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map(function (x) {
          return Number(x).toString(16).padStart(2, "0");
        })
        .join("")
    );
  }

  function buildPopupContent(layerName, properties) {
    const rows = Object.keys(properties || {})
      .filter(function (key) {
        return properties[key] !== null && properties[key] !== "";
      })
      .map(function (key) {
        return (
          "<tr><th>" +
          escapeHtml(key) +
          "</th><td>" +
          escapeHtml(properties[key]) +
          "</td></tr>"
        );
      })
      .join("");

    return (
      "<div class='popup-attrs'>" +
      "<div class='popup-attrs__title'>" +
      escapeHtml(layerName) +
      "</div>" +
      "<table>" +
      rows +
      "</table></div>"
    );
  }

  // ===========================================================================
  // Parser de estilos QMD/QGIS
  // ===========================================================================

  /**
   * Lê propriedades visuais de arquivos .qmd/.qml do QGIS.
   * Os QMD fornecidos são metadados; quando não houver simbologia, usa fallback.
   */
  function parseQmdStyle(xmlText, fallback) {
    const style = Object.assign({}, fallback);
    if (!xmlText) return style;

    try {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      const options = doc.querySelectorAll("Option");

      options.forEach(function (opt) {
        const name = opt.getAttribute("name");
        const value = opt.getAttribute("value");
        if (!name || value == null) return;

        if (name === "outline_color" || name === "line_color") {
          style.color = qgisColorToCss(value, style.color);
        }
        if (name === "fill_color") {
          style.fillColor = qgisColorToCss(value, style.fillColor);
        }
        if (name === "outline_width" || name === "line_width") {
          style.weight = parseFloat(value) || style.weight;
        }
        if (name === "outline_opacity" || name === "line_opacity") {
          style.opacity = parseFloat(value) / 100;
        }
        if (name === "fill_opacity") {
          style.fillOpacity = parseFloat(value) / 100;
        }
      });

      const strokeColor = doc.querySelector("stroke color");
      if (strokeColor) {
        style.color = qgisColorToCss(strokeColor.getAttribute("v"), style.color);
      }
      const fillColor = doc.querySelector("fill color");
      if (fillColor) {
        style.fillColor = qgisColorToCss(fillColor.getAttribute("v"), style.fillColor);
      }
    } catch (err) {
      console.warn(LOG, "QMD parse:", err);
    }

    return style;
  }

  function leafletStyleFromConfig(styleConfig) {
    const out = {
      color: cssColorToHex(styleConfig.color),
      weight: styleConfig.weight,
      opacity: styleConfig.opacity,
    };

    if (styleConfig.dashArray) out.dashArray = styleConfig.dashArray;
    if (styleConfig.fillColor != null) out.fillColor = cssColorToHex(styleConfig.fillColor);
    if (styleConfig.fillOpacity != null) out.fillOpacity = styleConfig.fillOpacity;

    return out;
  }

  // ===========================================================================
  // Mapa e basemaps
  // ===========================================================================

  function initializeWebGIS() {

  const canvasRenderer = L.canvas({ padding: 0.5 });

  const map = L.map("map", {
    center: BRAZIL_CENTER,
    zoom: BRAZIL_ZOOM,
    zoomControl: false,
    minZoom: 3,
    maxZoom: 22,
  });

  L.control.zoom({ position: "topleft" }).addTo(map);

  const basemaps = {
    "OpenStreetMap": L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
        subdomains: "abc",
      }
    ),
    "Esri World Imagery": L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxNativeZoom: 19,
        maxZoom: 22,
      }
    ),
    "CartoDB Dark Matter": L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; OSM &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ),
  };

  basemaps["OpenStreetMap"].addTo(map);

  let layerControl = null;
  const loadedLayers = {};
  const layerStyles = {};
  const legendState = {};

  // ===========================================================================
  // Interação com feições
  // ===========================================================================

  function bindFeatureInteraction(layer, leafletLayer, config, baseStyle) {
    if (!config.lightInteraction) {
      const highlight = leafletStyleFromConfig(
        Object.assign({}, baseStyle, config.highlight)
      );

      layer.on({
        mouseover: function (e) {
          e.target.setStyle(highlight);
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            e.target.bringToFront();
          }
        },
        mouseout: function (e) {
          leafletLayer.resetStyle(e.target);
        },
        click: function (e) {
          L.DomEvent.stopPropagation(e);
        },
      });
    } else {
      layer.on("click", function (e) {
        L.DomEvent.stopPropagation(e);
      });
    }

    if (config.lazyPopup) {
      layer.on("click", function (e) {
        if (!layer.getPopup()) {
          layer.bindPopup(buildPopupContent(config.label, layer.feature.properties), {
            maxWidth: 300,
            className: "feature-popup",
          });
        }
        layer.openPopup(e.latlng);
      });
    } else {
      layer.bindPopup(buildPopupContent(config.label, layer.feature.properties), {
        maxWidth: 300,
        className: "feature-popup",
      });
    }

    if (config.labelField) {
      const labelVal = layer.feature.properties[config.labelField];
      if (labelVal != null && labelVal !== "") {
        layer.bindTooltip(String(labelVal), {
          permanent: false,
          direction: "top",
          className: "feature-label",
        });
      }
    }
  }

  function createGeoJsonLayer(config, styleConfig) {
    const baseStyle = leafletStyleFromConfig(styleConfig);
    layerStyles[config.id] = baseStyle;

    const geoJsonLayer = L.geoJSON(null, {
      renderer: config.id === "car" ? canvasRenderer : undefined,
      style: function () {
        return Object.assign({}, baseStyle);
      },
      onEachFeature: function (feature, layer) {
        bindFeatureInteraction(layer, geoJsonLayer, config, styleConfig);
      },
    });

    return geoJsonLayer;
  }

  function setLayerOpacity(layerId, opacity) {
    const layer = loadedLayers[layerId];
    const base = layerStyles[layerId];
    if (!layer || !base) return;

    layer.setStyle(function () {
      const style = Object.assign({}, base);
      style.opacity = opacity;
      style.fillOpacity = Math.min(base.fillOpacity * opacity, 1);
      return style;
    });

    legendState[layerId] = opacity;
  }

  // ===========================================================================
  // Legenda com controle de opacidade
  // ===========================================================================

  function renderLegend() {
    DOM.legendPanel.innerHTML =
      "<div class='legend-panel__title'>Legenda</div>";

    THEMATIC_LAYERS.forEach(function (config) {
      const style = layerStyles[config.id];
      if (!style) return;

      const item = document.createElement("div");
      item.className = "legend-item";

      const swatchStyle =
        "background:" +
        (style.fillColor || style.color) +
        ";border-color:" +
        style.color +
        ";opacity:" +
        (style.fillOpacity > 0 ? style.fillOpacity : style.opacity);

      const opacity = legendState[config.id] ?? 1;

      item.innerHTML =
        "<div class='legend-item__head'>" +
        "<span class='legend-item__swatch' style='" + swatchStyle + "'></span>" +
        "<span class='legend-item__name'>" + escapeHtml(config.label) + "</span>" +
        "</div>" +
        "<input type='range' min='0' max='100' value='" + Math.round(opacity * 100) + "' " +
        "aria-label='Opacidade " + escapeHtml(config.label) + "'>" +
        "<div class='legend-item__value'>" + Math.round(opacity * 100) + "%</div>";

      const slider = item.querySelector("input");
      const valueEl = item.querySelector(".legend-item__value");

      slider.addEventListener("input", function () {
        const val = Number(slider.value) / 100;
        valueEl.textContent = slider.value + "%";
        setLayerOpacity(config.id, val);
      });

      DOM.legendPanel.appendChild(item);
    });
  }

  // ===========================================================================
  // Carregamento de camadas
  // ===========================================================================

  function normalizeFetchError(url, err) {
    if (err && err.name === "AbortError") {
      return new Error(
        "Tempo esgotado ao baixar " + url +
        ". Se os arquivos estão no OneDrive, clique com o botão direito em data/ → " +
        "\"Manter sempre neste dispositivo\" e recarregue (F5)."
      );
    }
    if (err instanceof SyntaxError) {
      return new Error("GeoJSON inválido em " + url + " (arquivo incompleto ou corrompido).");
    }
    return err instanceof Error ? err : new Error(String(err));
  }

  async function fetchWithTimeout(url, timeoutMs) {
    const fullUrl = assetUrl(url);
    console.info(LOG, "GET", fullUrl);
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      const res = await fetch(fullUrl, { cache: "no-store", signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status + " — " + url);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw normalizeFetchError(url, err);
    }
  }

  async function fetchText(url, timeoutMs) {
    const res = await fetchWithTimeout(url, timeoutMs || 30000);
    return res.text();
  }

  async function fetchJson(url, timeoutMs) {
    const res = await fetchWithTimeout(url, timeoutMs || 180000);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      throw normalizeFetchError(url, err);
    }
  }

  async function verifyServerReady() {
    const checks = ["data/estado.qmd", "data/estado.geojson", "data/CAR.geojson"];
    for (let i = 0; i < checks.length; i++) {
      const path = checks[i];
      try {
        const res = await fetchWithTimeout(path, 15000);
        if (!res.ok) throw new Error("HTTP " + res.status);
        console.info(LOG, "OK:", path);
      } catch (err) {
        console.warn(LOG, "Verificação falhou:", path, err.message);
        throw new Error(
          "Arquivo ausente ou inacessível: " + path +
          ". Execute start_server.bat na pasta do projeto e confira data/."
        );
      }
    }
    console.info(LOG, "Servidor e pasta data/ verificados.");
  }

  async function addGeoJsonInChunks(layer, data, config) {
    const features = data.features || [];
    const chunkSize = config.chunkSize || 0;

    if (!chunkSize || features.length <= chunkSize) {
      layer.addData(data);
      return;
    }

    for (let i = 0; i < features.length; i += chunkSize) {
      layer.addData({
        type: "FeatureCollection",
        features: features.slice(i, i + chunkSize),
      });
      const done = Math.min(i + chunkSize, features.length);
      setLoader("Processando " + config.label + "... " + done + "/" + features.length);
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
    }
  }

  async function loadThematicLayer(config) {
    setLoader("Carregando " + config.label + "...");

    let qmdText = "";
    try {
      qmdText = await fetchText(config.qmd);
      console.info(LOG, config.label + ": QMD carregado");
    } catch (err) {
      console.warn(LOG, config.label + ": QMD indisponível, usando estilo padrão.", err.message);
    }

    const styleConfig = parseQmdStyle(qmdText, config.fallback);
    const geoJsonLayer = createGeoJsonLayer(config, styleConfig);

    const data = await fetchJson(config.geojson, config.id === "car" ? 300000 : 120000);
    setLoader("Processando " + config.label + "...");
    await addGeoJsonInChunks(geoJsonLayer, data, config);
    console.info(
      LOG,
      config.label + ": GeoJSON OK (" + (data.features ? data.features.length : 0) + " feições)"
    );

    loadedLayers[config.id] = geoJsonLayer;
    legendState[config.id] = 1;

    return geoJsonLayer;
  }

  function cleanupThematicLayers() {
    Object.keys(loadedLayers).forEach(function (id) {
      const layer = loadedLayers[id];
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
      delete loadedLayers[id];
      delete layerStyles[id];
      delete legendState[id];
    });

    if (layerControl) {
      map.removeControl(layerControl);
      layerControl = null;
    }
  }

  async function initThematicLayers() {
    resetLoaderUi();
    checkServerEnvironment();
    cleanupThematicLayers();
    setLoader("Verificando servidor...");
    await verifyServerReady();

    const overlayGroup = {};
    let fitLayer = null;
    const loadErrors = [];
    const sorted = THEMATIC_LAYERS.slice().sort(function (a, b) {
      if (a.fitPriority) return -1;
      if (b.fitPriority) return 1;
      return a.zIndex - b.zIndex;
    });

    for (let i = 0; i < sorted.length; i++) {
      const config = sorted[i];
      try {
        const layer = await loadThematicLayer(config);
        overlayGroup[config.label] = layer;
        if (config.fitPriority) fitLayer = layer;

        if (config.defaultVisible && layer.getBounds().isValid()) {
          layer.addTo(map);
        }
      } catch (err) {
        loadErrors.push({ label: config.label, message: err.message });
        console.error(LOG, "Falha:", config.label, err);
      }
    }

    if (Object.keys(loadedLayers).length === 0) {
      const details = loadErrors
        .map(function (e) { return e.label + ": " + e.message; })
        .join(" | ");
      throw new Error(details || "Nenhuma camada carregada. Verifique a pasta data/.");
    }

    sorted.forEach(function (config) {
      const layer = loadedLayers[config.id];
      if (layer && config.defaultVisible && layer.getBounds().isValid() && !map.hasLayer(layer)) {
        layer.addTo(map);
      }
    });

    layerControl = L.control.layers(
      basemaps,
      overlayGroup,
      { collapsed: true, position: "topright" }
    );
    layerControl.addTo(map);

    renderLegend();

    if (fitLayer && fitLayer.getBounds().isValid()) {
      map.fitBounds(fitLayer.getBounds(), { padding: [40, 40] });
    }

    if (loadErrors.length > 0) {
      const names = loadErrors.map(function (e) { return e.label; }).join(", ");
      console.warn(LOG, "Camadas com falha parcial:", loadErrors);
      showLoaderError(
        "Algumas camadas não carregaram: " + names,
        "As demais camadas estão disponíveis. Confira o console (F12) para detalhes.",
        true
      );
      return { partial: true, errors: loadErrors };
    }

    console.info(LOG, "Todas as camadas carregadas com sucesso.");
    return { partial: false, errors: [] };
  }

  // ===========================================================================
  // Marcador, coordenadas, medição, minimapa (funcionalidades existentes)
  // ===========================================================================

  L.marker(BRASILIA)
    .addTo(map)
    .bindPopup(
      "<strong>Brasília</strong><br>Capital federal do Brasil<br>" +
        "<small>Lat: " + BRASILIA[0].toFixed(5) + "° | Lng: " + BRASILIA[1].toFixed(5) + "°</small>"
    );

  L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);

  map.on("mousemove", function (e) {
    DOM.coordsBar.textContent =
      "Lat: " + formatCoord(e.latlng.lat) + "  |  Lng: " + formatCoord(e.latlng.lng);
  });

  map.on("mouseout", function () {
    DOM.coordsBar.textContent = "Lat: --  |  Lng: --";
  });

  let measuring = false;
  let measurePoints = [];
  let measureLine = null;
  let measureMarkers = [];

  const miniMap = L.map("minimap", {
    center: BRAZIL_CENTER,
    zoom: BRAZIL_ZOOM - 3,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    subdomains: "abc",
  }).addTo(miniMap);

  const viewRect = L.rectangle(map.getBounds(), {
    color: "#38bdf8",
    weight: 2,
    fillOpacity: 0.15,
    interactive: false,
  }).addTo(miniMap);

  function syncMiniMap() {
    miniMap.setView(map.getCenter(), Math.max(map.getZoom() - 4, 1));
    viewRect.setBounds(map.getBounds());
  }

  map.on("moveend zoomend", syncMiniMap);
  syncMiniMap();

  function refreshMapSize() {
    map.invalidateSize();
    miniMap.invalidateSize();
  }

  window.addEventListener("load", refreshMapSize);
  window.addEventListener("resize", refreshMapSize);

  DOM.btnFullscreen.addEventListener("click", function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {
        alert("Seu navegador não suporta tela cheia.");
      });
    } else {
      document.exitFullscreen();
    }
  });

  DOM.btnLocate.addEventListener("click", function () {
    map.locate({ setView: true, maxZoom: 14 });
    map.once("locationfound", function (e) {
      L.circleMarker(e.latlng, {
        radius: 8,
        color: "#0ea5e9",
        fillColor: "#38bdf8",
        fillOpacity: 0.7,
        weight: 2,
      })
        .addTo(map)
        .bindPopup("Sua localização atual")
        .openPopup();
    });
    map.once("locationerror", function () {
      alert("Não foi possível obter sua localização.");
    });
  });

  function formatDistance(meters) {
    return meters >= 1000
      ? (meters / 1000).toFixed(2) + " km"
      : Math.round(meters) + " m";
  }

  function updateMeasureDisplay() {
    let total = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      total += map.distance(measurePoints[i - 1], measurePoints[i]);
    }
    DOM.measureDistanceEl.textContent = formatDistance(total);
  }

  function clearMeasure() {
    measurePoints = [];
    if (measureLine) {
      map.removeLayer(measureLine);
      measureLine = null;
    }
    measureMarkers.forEach(function (m) { map.removeLayer(m); });
    measureMarkers = [];
    DOM.measureDistanceEl.textContent = "0 m";
  }

  function toggleMeasure() {
    measuring = !measuring;
    DOM.btnMeasure.classList.toggle("active", measuring);
    DOM.measureInfo.classList.toggle("hidden", !measuring);
    DOM.mapContainer.classList.toggle("measuring", measuring);
    if (!measuring) clearMeasure();
  }

  DOM.btnMeasure.addEventListener("click", toggleMeasure);
  DOM.btnMeasureClear.addEventListener("click", clearMeasure);

  map.on("click", function (e) {
    if (measuring) {
      measurePoints.push(e.latlng);
      const marker = L.circleMarker(e.latlng, {
        radius: 5,
        color: "#f97316",
        fillColor: "#fb923c",
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      measureMarkers.push(marker);
      if (measureLine) map.removeLayer(measureLine);
      if (measurePoints.length > 1) {
        measureLine = L.polyline(measurePoints, {
          color: "#f97316",
          weight: 3,
          dashArray: "6 4",
        }).addTo(map);
      }
      updateMeasureDisplay();
      return;
    }

    L.popup()
      .setLatLng(e.latlng)
      .setContent(
        "<div class='popup-coords'><strong>Coordenadas</strong><br>" +
          "Latitude: " + formatCoord(e.latlng.lat) + "<br>" +
          "Longitude: " + formatCoord(e.latlng.lng) + "</div>"
      )
      .openOn(map);
  });

  // ===========================================================================
  // Inicialização do mapa (somente via HTTP)
  // ===========================================================================

  function bootApp() {
    resetLoaderUi();
    setLoader("Inicializando mapa...", true);

    initThematicLayers()
      .then(function (result) {
        refreshMapSize();
        if (!result || !result.partial) {
          setLoader("", false);
          console.info(LOG, "WebGIS pronto para uso.");
        } else {
          DOM.loaderRetry.classList.remove("hidden");
        }
      })
      .catch(function (err) {
        console.error(LOG, "Erro fatal:", err);
        const detail = (err && err.message) ? err.message : getLoadErrorHint();
        showLoaderError("Falha ao carregar camadas", detail, true);
      });
  }

  if (DOM.loaderRetry) {
    DOM.loaderRetry.addEventListener("click", bootApp);
  }

  bootApp();
  } // fim initializeWebGIS

  // ===========================================================================
  // Startup: detecta ambiente antes de iniciar o mapa
  // ===========================================================================

  async function startup() {
    logEnvironmentStatus();
    bindCopyButtons();

    if (IS_FILE_PROTOCOL) {
      showServerGuide();
      await probeLocalServers();
      return;
    }

    hideServerGuide();
    initializeWebGIS();
  }

  startup();

})();
