// Rendering and canvas management
(() => {
  const NM = window.NM;

  const canvasWrap = document.getElementById('canvas-wrap');
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  let imgData;
  let buf;

  function resizeCanvas() {
    if (!canvasWrap) return;

    const rect = canvasWrap.getBoundingClientRect();
    W = Math.floor(rect.width);
    H = Math.floor(rect.height);

    canvas.width = W;
    canvas.height = H;

    // Recreate image data after resize
    imgData = ctx.createImageData(W, H);
    buf = imgData.data;

    // Only render if layers exist
    if (typeof renderNow === 'function' && window.layers) {
      renderNow();
    }
  }

  // Initial canvas setup
  if (canvasWrap) {
    const rect = canvasWrap.getBoundingClientRect();
    W = Math.floor(rect.width);
    H = Math.floor(rect.height);
    canvas.width = W;
    canvas.height = H;
    imgData = ctx.createImageData(W, H);
    buf = imgData.data;
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  if (window.ResizeObserver && canvasWrap) {
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(canvasWrap);
  }

  function sampleNoise(l, x, y, z) {
    NM.cacheBuiltInDefaults();
    const params = NM.ensureLayerParams(l);
    const noiseFn = NoiseLib.getNoiseFunction(l.type);

    if (NM.customFns[l.type]) {
      try {
        const v = +NM.customFns[l.type](x, y, z, l.seed, params);
        return isNaN(v) ? 0 : Math.max(0, Math.min(1, v));
      } catch (e) {
        return 0;
      }
    }

    return noiseFn(x, y, z, l.seed, params);
  }

  function colorize(n, cm, bufRef, i) {
    let r, g, b;
    const scheme = NM.colorSchemes[cm];

    if (!scheme) {
      r = g = b = n * 255;
    } else if (scheme.type === 'gradient') {
      const stops = scheme.stops;
      let color = stops[0];
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
      color = stops[stops.length - 1];
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

    bufRef[i] = Math.max(0, Math.min(255, r));
    bufRef[i + 1] = Math.max(0, Math.min(255, g));
    bufRef[i + 2] = Math.max(0, Math.min(255, b));
    bufRef[i + 3] = 255;
  }

  let frameCount = 0;
  let lastFpsTime = performance.now();
  let renderQueued = false;
  let renderDirty = false;

  function renderNow() {
    const visLayers = window.layers.filter(l => l.visible);

    if (!visLayers.length) {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#444';
      ctx.font = '13px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('+ Add a layer to start', W / 2, H / 2);
      return;
    }

    const { res, color: cm, offsetX: gOffsetX, offsetY: gOffsetY, zoom, invert: inv, contour: ctr } = NM.gState;
    const z = window.zValue;
    const nL = visLayers.length;

    for (let y = 0; y < H; y += res) {
      for (let x = 0; x < W; x += res) {
        let final = 0;

        for (let li = 0; li < nL; li++) {
          const l = visLayers[li];
          const blend = l.blend;
          NM.ensureLayerParams(l);

          let nx = (x + gOffsetX) * zoom + l.offsetX;
          let ny = (y + gOffsetY) * zoom + l.offsetY;
          let n = sampleNoise(l, nx, ny, z + l.z);
          n = n < 0 ? 0 : n > 1 ? 1 : n;
          const w = 1;

          if (li === 0) {
            final = n * w;
          } else {
            if (blend === 'avg') {
              final = (final + n * w) / 2;
            } else if (blend === 'add') {
              final = Math.min(1, final + n * w);
            } else if (blend === 'mul') {
              final *= n;
            } else if (blend === 'max') {
              final = Math.max(final, n * w);
            } else if (blend === 'min') {
              final = Math.min(final, n * w);
            } else if (blend === 'diff') {
              final = Math.abs(final - n * w);
            }
          }
        }

        if (inv) final = 1 - final;
        if (ctr && Math.abs(final - Math.round(final * 8) / 8) < 0.013) final = 1;

        const bi = 4 * (y * W + x);
        colorize(final, cm, buf, bi);

        if (res > 1) {
          const rv = buf[bi];
          const gv = buf[bi + 1];
          const bv = buf[bi + 2];
          for (let dy = 0; dy < res && y + dy < H; dy++) {
            for (let dx = 0; dx < res && x + dx < W; dx++) {
              if (dx === 0 && dy === 0) continue;
              const ii = 4 * ((y + dy) * W + (x + dx));
              buf[ii] = rv;
              buf[ii + 1] = gv;
              buf[ii + 2] = bv;
              buf[ii + 3] = 255;
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime > 500) {
      const fps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
      const fpsEl = document.getElementById('fps');
      if (fpsEl) fpsEl.textContent = fps + ' fps';
      frameCount = 0;
      lastFpsTime = now;
    }
  }

  function requestRender() {
    renderDirty = true;
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (!renderDirty) return;
      renderDirty = false;
      renderNow();
    });
  }

  function render() {
    requestRender();
  }

  NM.canvas = canvas;
  NM.ctx = ctx;
  NM.resizeCanvas = resizeCanvas;
  NM.renderNow = renderNow;
  NM.requestRender = requestRender;
  NM.render = render;
  NM.W = () => W;
  NM.H = () => H;

  // Backward compatible globals
  window.canvas = canvas;
  window.ctx = ctx;
  window.render = render;
})();
