// Render modal + PNG export (separate module)
(() => {
  const renderMenuBtn = document.getElementById('menu-render');
  const renderModal = document.getElementById('render-modal');
  const renderClose = document.getElementById('render-close');
  const renderCancel = document.getElementById('render-cancel');
  const renderRun = document.getElementById('render-run');
  const renderPause = document.getElementById('render-pause');
  const renderWidth = document.getElementById('render-width');
  const renderHeight = document.getElementById('render-height');
  const renderColor = document.getElementById('render-color');
  const renderZoom = document.getElementById('render-zoom');
  const renderPanX = document.getElementById('render-panx');
  const renderPanY = document.getElementById('render-pany');
  const renderMsg = document.getElementById('render-msg');
  const renderProgressBar = document.getElementById('render-progress-bar');
  const renderPercent = document.getElementById('render-percent');
  const renderEta = document.getElementById('render-eta');

  const renderState = {
    running: false,
    paused: false,
    abort: false,
    settings: null,
    percent: 0,
    etaText: 'ETA --:--',
    speedEma: 0,
    lastEtaUpdate: 0,
    lastEtaPixels: 0,
    y: 0,
    startTime: 0,
    width: 0,
    height: 0,
    chunk: 0,
    layerData: null,
    colorScheme: null,
    gs: null,
    zBase: 0,
    canvas: null,
    ctx: null,
    imgData: null,
    buf: null
  };

  function populateRenderColorSchemes() {
    if (!renderColor || !window.NM?.colorSchemes) return;
    renderColor.innerHTML = '';
    Object.keys(window.NM.colorSchemes).forEach(key => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = window.NM.colorSchemes[key].name || key;
      renderColor.appendChild(o);
    });
  }

  function openRenderModal() {
    const canvasRef = window.canvas || document.getElementById('c');
    const w = canvasRef?.width || 512;
    const h = canvasRef?.height || 512;
    const gs = window.NM?.gState || window.gState || {};

    populateRenderColorSchemes();
    const s = renderState.settings;
    if (renderWidth) renderWidth.value = s?.width ?? w;
    if (renderHeight) renderHeight.value = s?.height ?? h;
    if (renderColor) renderColor.value = s?.color ?? (gs.color || 'gray');
    if (renderZoom) renderZoom.value = s?.zoom ?? (gs.zoom ?? 1);
    if (renderPanX) renderPanX.value = s?.panX ?? (gs.offsetX ?? 0);
    if (renderPanY) renderPanY.value = s?.panY ?? (gs.offsetY ?? 0);
    if (renderMsg) renderMsg.textContent = renderState.running ? 'Rendering...' : '';
    if (renderProgressBar) renderProgressBar.style.width = renderState.running ? renderState.percent + '%' : '0%';
    if (renderPercent) renderPercent.textContent = renderState.running ? renderState.percent + '%' : '0%';
    if (renderEta) renderEta.textContent = renderState.running ? renderState.etaText : 'ETA --:--';

    if (renderRun) renderRun.disabled = renderState.running;
    if (renderPause) {
      renderPause.disabled = !renderState.running;
      renderPause.textContent = renderState.paused ? 'Resume' : 'Pause';
    }

    renderModal.classList.remove('hidden');
  }

  function saveSettingsFromInputs() {
    if (!renderWidth || !renderHeight || !renderColor || !renderZoom || !renderPanX || !renderPanY) return;
    renderState.settings = {
      width: Math.max(16, parseInt(renderWidth.value, 10) || 512),
      height: Math.max(16, parseInt(renderHeight.value, 10) || 512),
      color: renderColor.value || 'gray',
      zoom: parseFloat(renderZoom.value) || 1,
      panX: parseFloat(renderPanX.value) || 0,
      panY: parseFloat(renderPanY.value) || 0
    };
  }

  function closeRenderModal() {
    saveSettingsFromInputs();
    // Keep rendering in background; just hide modal.
    renderModal.classList.add('hidden');
  }

  function renderColorize(n, scheme, bufRef, i) {
    let r, g, b;
    if (!scheme) {
      r = g = b = n * 255;
    } else if (scheme.type === 'gradient') {
      const stops = scheme.stops;
      for (let j = 0; j < stops.length - 1; j++) {
        if (n >= stops[j].value && n <= stops[j + 1].value) {
          const t = (n - stops[j].value) / (stops[j + 1].value - stops[j].value);
          r = Math.round(stops[j].r + t * (stops[j + 1].r - stops[j].r));
          g = Math.round(stops[j].g + t * (stops[j + 1].g - stops[j].g));
          b = Math.round(stops[j].b + t * (stops[j + 1].b - stops[j].b));
          bufRef[i] = r;
          bufRef[i + 1] = g;
          bufRef[i + 2] = b;
          bufRef[i + 3] = 255;
          return;
        }
      }
      const color = stops[stops.length - 1];
      r = color.r;
      g = color.g;
      b = color.b;
    } else if (scheme.type === 'stops') {
      const stops = scheme.stops;
      let color = stops[0];
      for (let j = 0; j < stops.length; j++) {
        if (n <= stops[j].value) {
          color = stops[j];
          break;
        }
      }
      r = color.r;
      g = color.g;
      b = color.b;
    } else {
      r = g = b = n * 255;
    }

    bufRef[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    bufRef[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    bufRef[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    bufRef[i + 3] = 255;
  }

  function renderSampleNoise(layer, x, y, z, fn, params, customFn) {
    if (customFn) {
      try {
        const v = +customFn(x, y, z, layer.seed, params);
        return isNaN(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v;
      } catch (e) {
        return 0;
      }
    }
    return fn(x, y, z, layer.seed, params);
  }

  function formatEta(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return 'ETA --:--';
    if (seconds < 60) return 'ETA ' + seconds.toFixed(1) + 's';
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return 'ETA ' + String(m) + ':' + String(r).padStart(2, '0');
  }

  function startRenderImage() {
    if (!renderRun) return;
    if (renderState.running) return;

    renderState.abort = false;
    renderState.paused = false;

    const width = Math.max(16, parseInt(renderWidth.value, 10) || 512);
    const height = Math.max(16, parseInt(renderHeight.value, 10) || 512);
    const colorKey = renderColor.value || 'gray';
    const zoom = parseFloat(renderZoom.value) || 1;
    const panX = parseFloat(renderPanX.value) || 0;
    const panY = parseFloat(renderPanY.value) || 0;
    const zBase = typeof window.zValue === 'number' ? window.zValue : 0;
    const gs = window.NM?.gState || window.gState || {};

    renderState.settings = { width, height, color: colorKey, zoom, panX, panY };

    const visLayers = (window.layers || []).filter(l => l.visible);
    if (!visLayers.length) {
      if (renderMsg) {
        renderMsg.textContent = 'No visible layers to render.';
        renderMsg.className = 'msg err';
      }
      return;
    }

    window.NM?.cacheBuiltInDefaults?.();

    const layerData = visLayers.map(l => {
      const params = window.NM?.ensureLayerParams?.(l) || l.params || {};
      const customFn = window.NM?.customFns?.[l.type];
      const fn = customFn ? null : NoiseLib.getNoiseFunction(l.type);
      return {
        layer: l,
        params,
        fn,
        customFn,
        blend: l.blend,
        offsetX: l.offsetX,
        offsetY: l.offsetY,
        z: l.z
      };
    });

    const colorScheme = window.NM?.colorSchemes?.[colorKey];

    renderState.running = true;
    renderRun.disabled = true;
    if (renderPause) {
      renderPause.disabled = false;
      renderPause.textContent = 'Pause';
    }
    if (renderMsg) {
      renderMsg.textContent = 'Rendering...';
      renderMsg.className = 'msg';
    }
    renderState.percent = 0;
    renderState.etaText = 'ETA --:--';
    renderState.speedEma = 0;
    renderState.lastEtaUpdate = performance.now();
    renderState.lastEtaPixels = 0;
    if (renderProgressBar) renderProgressBar.style.width = '0%';
    if (renderPercent) renderPercent.textContent = '0%';
    if (renderEta) renderEta.textContent = renderState.etaText;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const buf = imgData.data;

    renderState.canvas = canvas;
    renderState.ctx = ctx;
    renderState.imgData = imgData;
    renderState.buf = buf;
    renderState.y = 0;
    renderState.width = width;
    renderState.height = height;
    renderState.chunk = Math.max(4, Math.floor(8192 / Math.max(1, width)));
    renderState.layerData = layerData;
    renderState.colorScheme = colorScheme;
    renderState.gs = gs;
    renderState.zBase = zBase;
    renderState.startTime = performance.now();

    const nL = layerData.length;

    const step = () => {
      if (renderState.abort) {
        renderState.running = false;
        renderRun.disabled = false;
        if (renderPause) renderPause.disabled = true;
        return;
      }

      if (renderState.paused) {
        requestAnimationFrame(step);
        return;
      }

      const yEnd = Math.min(renderState.height, renderState.y + renderState.chunk);
      for (; renderState.y < yEnd; renderState.y++) {
        const rowIndex = renderState.y * renderState.width * 4;
        for (let x = 0; x < renderState.width; x++) {
          let final = 0;
          for (let li = 0; li < nL; li++) {
            const ld = renderState.layerData[li];
            const layer = ld.layer;
            const nx = (x + panX) * zoom + ld.offsetX;
            const ny = (renderState.y + panY) * zoom + ld.offsetY;
            let n = renderSampleNoise(layer, nx, ny, renderState.zBase + ld.z, ld.fn, ld.params, ld.customFn);
            if (n < 0) n = 0;
            else if (n > 1) n = 1;

            if (li === 0) {
              final = n;
            } else if (ld.blend === 'avg') {
              final = (final + n) / 2;
            } else if (ld.blend === 'add') {
              final = Math.min(1, final + n);
            } else if (ld.blend === 'mul') {
              final *= n;
            } else if (ld.blend === 'max') {
              final = Math.max(final, n);
            } else if (ld.blend === 'min') {
              final = Math.min(final, n);
            } else if (ld.blend === 'diff') {
              final = Math.abs(final - n);
            }
          }

          if (renderState.gs.invert) final = 1 - final;
          if (renderState.gs.contour && Math.abs(final - Math.round(final * 8) / 8) < 0.013) final = 1;

          const bi = rowIndex + x * 4;
          renderColorize(final, renderState.colorScheme, renderState.buf, bi);
        }
      }

      const pct = Math.min(100, Math.round((renderState.y / renderState.height) * 100));
      renderState.percent = pct;
      if (renderProgressBar) renderProgressBar.style.width = pct + '%';
      if (renderPercent) renderPercent.textContent = pct + '%';

      const elapsed = (performance.now() - renderState.startTime) / 1000;
      const now = performance.now();
      const donePixels = renderState.y * renderState.width;
      const deltaPixels = donePixels - renderState.lastEtaPixels;
      const deltaSeconds = (now - renderState.lastEtaUpdate) / 1000;
      if (deltaSeconds > 0 && deltaPixels >= 0) {
        const instSpeed = deltaPixels / deltaSeconds;
        renderState.speedEma = renderState.speedEma > 0 ? (renderState.speedEma * 0.82 + instSpeed * 0.18) : instSpeed;
        renderState.lastEtaPixels = donePixels;
        renderState.lastEtaUpdate = now;
      }

      const remainingPixels = (renderState.height * renderState.width) - donePixels;
      const eta = renderState.speedEma > 0 ? remainingPixels / renderState.speedEma : 0;
      renderState.etaText = formatEta(eta);
      if (renderEta) renderEta.textContent = renderState.etaText;

      if (renderState.y < renderState.height) {
        requestAnimationFrame(step);
      } else {
        renderState.ctx.putImageData(renderState.imgData, 0, 0);
        renderState.canvas.toBlob(blob => {
          const name = (window.currentProjectName || 'NoiseRender').replace(/[^a-zA-Z0-9_]/g, '_');
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = name + '_' + width + 'x' + height + '.png';
          a.click();
          URL.revokeObjectURL(a.href);

          if (renderMsg) {
            renderMsg.textContent = 'Render complete. Download started.';
            renderMsg.className = 'msg ok';
          }
          renderState.running = false;
          renderRun.disabled = false;
          if (renderPause) renderPause.disabled = true;
        }, 'image/png');
      }
    };

    requestAnimationFrame(step);
  }

  function togglePause() {
    if (!renderState.running) return;
    renderState.paused = !renderState.paused;
    if (renderPause) renderPause.textContent = renderState.paused ? 'Resume' : 'Pause';
    if (renderMsg) {
      renderMsg.textContent = renderState.paused ? 'Paused.' : 'Rendering...';
      renderMsg.className = 'msg';
    }
  }

  function cancelRender() {
    if (renderState.running) {
      renderState.abort = true;
      renderState.paused = false;
      renderState.running = false;
      if (renderMsg) {
        renderMsg.textContent = 'Render cancelled.';
        renderMsg.className = 'msg err';
      }
      if (renderRun) renderRun.disabled = false;
      if (renderPause) renderPause.disabled = true;
    }
    closeRenderModal();
  }

  if (renderMenuBtn) renderMenuBtn.addEventListener('click', openRenderModal);
  if (renderClose) renderClose.addEventListener('click', closeRenderModal);
  if (renderCancel) renderCancel.addEventListener('click', cancelRender);
  if (renderModal) {
    renderModal.addEventListener('click', (e) => {
      if (e.target === renderModal) closeRenderModal();
    });
  }
  if (renderRun) renderRun.addEventListener('click', startRenderImage);
  if (renderPause) renderPause.addEventListener('click', togglePause);
  if (renderWidth) renderWidth.addEventListener('change', saveSettingsFromInputs);
  if (renderHeight) renderHeight.addEventListener('change', saveSettingsFromInputs);
  if (renderColor) renderColor.addEventListener('change', saveSettingsFromInputs);
  if (renderZoom) renderZoom.addEventListener('change', saveSettingsFromInputs);
  if (renderPanX) renderPanX.addEventListener('change', saveSettingsFromInputs);
  if (renderPanY) renderPanY.addEventListener('change', saveSettingsFromInputs);
})();
