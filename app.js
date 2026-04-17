// Noise Mixer - Main Application Script using Noise Library

// Example noise functions
const EXAMPLES = [
  `function ripple(x, y, z, seed, scale, params) {
  let r = Math.sqrt((x - 240) ** 2 + (y - 180) ** 2);
  return (Math.sin(r / scale - z * 3) + 1) / 2;
}`,
  `function spiral(x, y, z, seed, scale, params) {
  let dx = x - 240, dy = y - 180;
  let a = Math.atan2(dy, dx), r = Math.sqrt(dx*dx + dy*dy);
  return (Math.sin(a * 4 + r / scale - z * 2) + 1) / 2;
}`,
  `function tartan(x, y, z, seed, scale, params) {
  return ((Math.sin(x / scale + z) * Math.sin(y / scale + z)) + 1) / 2;
}`,
  `function plasma2(x, y, z, seed, scale, params) {
  return (Math.sin(x/scale) + Math.sin(y/scale) + Math.sin((x+y)/scale) + Math.sin(Math.sqrt(x*x+y*y)/scale + z)) / 4 * 0.5 + 0.5;
}`,
  `function zigzag(x, y, z, seed, scale, params) {
  let v = Math.sin(x / scale + z) * 0.5 + 0.5;
  return Math.abs(2 * v - 1);
}`
];

// Color Schemes System
const colorSchemes = {
  gray: {
    name: 'Grayscale',
    type: 'gradient',
    stops: [
      { value: 0, r: 0, g: 0, b: 0 },
      { value: 1, r: 255, g: 255, b: 255 }
    ]
  },
  terrain: {
    name: 'Terrain',
    type: 'stops',
    stops: [
      { value: 0.35, r: 30, g: 80, b: 200 },
      { value: 0.42, r: 210, g: 190, b: 130 },
      { value: 0.7, r: 100, g: 150, b: 60 },
      { value: 0.85, r: 150, g: 120, b: 90 },
      { value: 1.0, r: 240, g: 240, b: 245 }
    ]
  },
  heat: {
    name: 'Heat',
    type: 'gradient',
    stops: [
      { value: 0, r: 0, g: 0, b: 0 },
      { value: 0.33, r: 255, g: 0, b: 0 },
      { value: 0.66, r: 255, g: 255, b: 0 },
      { value: 1, r: 255, g: 255, b: 255 }
    ]
  },
  ice: {
    name: 'Ice',
    type: 'gradient',
    stops: [
      { value: 0, r: 20, g: 20, b: 40 },
      { value: 0.5, r: 100, g: 180, b: 220 },
      { value: 1, r: 240, g: 240, b: 255 }
    ]
  },
};

// Constants - Noise types loaded from NoiseLib
const NOISE_TYPES = NoiseLib.types;

function ensureLayerParams(l) {
  if (!l.params || typeof l.params !== 'object') l.params = {};
  if (!l.paramsMeta || typeof l.paramsMeta !== 'object') l.paramsMeta = {};

  // Migrate legacy fields if present
  if (typeof l.scale === 'number' && l.params.scale === undefined) l.params.scale = l.scale;
  if (typeof l.octaves === 'number' && l.params.octaves === undefined) l.params.octaves = l.octaves;
  if (typeof l.falloff === 'number' && l.params.falloff === undefined) l.params.falloff = l.falloff;

  // Apply built-in defaults (if any)
  const builtInDefaults = builtInParamDefaults[l.type];
  if (builtInDefaults && typeof builtInDefaults === 'object') {
    Object.keys(builtInDefaults).forEach(key => {
      if (l.params[key] === undefined) l.params[key] = builtInDefaults[key];
    });
  }

  // Apply custom function defaults (if any)
  const defaults = customFnParamDefaults[l.type];
  if (defaults && typeof defaults === 'object') {
    Object.keys(defaults).forEach(key => {
      if (l.params[key] === undefined) l.params[key] = defaults[key];
    });
  }

  // Auto-infer params meta (if missing)
  Object.keys(l.params).forEach(key => {
    if (l.paramsMeta[key]) return;
    const v = l.params[key];
    l.paramsMeta[key] = { type: typeof v === 'boolean' ? 'toggle' : 'number' };
  });

  // Apply built-in meta (if any)
  const builtInMeta = builtInParamMeta[l.type];
  if (builtInMeta && typeof builtInMeta === 'object') {
    Object.keys(builtInMeta).forEach(key => {
      if (!l.paramsMeta[key]) l.paramsMeta[key] = builtInMeta[key];
    });
  }

  return l.params;
}

function extractDefaultParamsFromSource(src) {
  const head = src.split(')')[0] || src;
  const match = head.match(/params\s*=\s*({[\s\S]*})/);
  if (!match) return null;
  const literal = match[1];
  try {
    return new Function('return (' + literal + ')')();
  } catch {
    return null;
  }
}

function cacheBuiltInDefaults() {
  NOISE_TYPES.forEach(type => {
    if (builtInParamDefaults[type]) return;
    const fn = NoiseLib.getNoiseFunction(type);
    if (!fn) return;
    const defaults = extractDefaultParamsFromSource(fn.toString());
    if (defaults && typeof defaults === 'object') {
      builtInParamDefaults[type] = defaults;
      const meta = {};
      Object.keys(defaults).forEach(k => {
        meta[k] = { type: typeof defaults[k] === 'boolean' ? 'toggle' : 'number' };
      });
      builtInParamMeta[type] = meta;
    }
  });
}

function applyDefaultsForType(l) {
  const defaults = customFnParamDefaults[l.type];
  if (!defaults) return;
  if (!l.params || typeof l.params !== 'object') l.params = {};
  Object.keys(defaults).forEach(key => {
    if (l.params[key] === undefined) l.params[key] = defaults[key];
  });
  if (!l.paramsMeta || typeof l.paramsMeta !== 'object') l.paramsMeta = {};
  const meta = customFnParamMeta[l.type];
  if (meta) {
    Object.keys(meta).forEach(key => {
      if (!l.paramsMeta[key]) l.paramsMeta[key] = meta[key];
    });
  }
}

function normalizeLayer(raw) {
  const l = { ...raw };
  if (typeof l.scale !== 'number') l.scale = 60;
  if (typeof l.seed !== 'number') l.seed = 0;
  if (typeof l.z !== 'number') l.z = 0;
  if (typeof l.offsetX !== 'number') l.offsetX = 0;
  if (typeof l.offsetY !== 'number') l.offsetY = 0;
  if (!l.blend) l.blend = 'avg';
  if (typeof l.visible !== 'boolean') l.visible = true;
  if (typeof l.collapsed !== 'boolean') l.collapsed = false;
  if (!l.paramsMeta || typeof l.paramsMeta !== 'object') l.paramsMeta = {};
  ensureLayerParams(l);
  return l;
}

// Canvas Setup - Responsive sizing
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
  if (typeof render === 'function' && layers) {
    render();
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

// Handle window resize with responsive recalculation
window.addEventListener('resize', () => {
  resizeCanvas();
});

// Use ResizeObserver to detect container size changes
if (window.ResizeObserver && canvasWrap) {
  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
  });
  resizeObserver.observe(canvasWrap);
}

// Global State
const gState = {
  res: 2,
  color: 'gray',
  offsetX: 0,
  offsetY: 0,
  zoom: 1
};

let zAuto = 0;
let zValue = 0;
let uid = 0;
let layers = [];
const customFns = {};
const customFnParamDefaults = {};
const customFnParamMeta = {};
const builtInParamDefaults = {};
const builtInParamMeta = {};
let dragSrcId = null;

// State tracking for dirty rendering
let dirtyStateFields = new Set();
let frameCount = 0;
let lastFpsTime = performance.now();

// Pan and Zoom
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;

// Noise Sampling - Uses NoiseLib
function sampleNoise(l, x, y, z) {
  cacheBuiltInDefaults();
  const params = ensureLayerParams(l);
  const noiseFn = NoiseLib.getNoiseFunction(l.type);
  
  if (customFns[l.type]) {
    try {
      const v = +customFns[l.type](x, y, z, l.seed, params);
      return isNaN(v) ? 0 : Math.max(0, Math.min(1, v));
    } catch (e) {
      return 0;
    }
  }
  
  return noiseFn(x, y, z, l.seed, params);
}



// Colorization - Uses color schemes
function colorize(n, cm, buf, i) {
  let r, g, b;
  const scheme = colorSchemes[cm];
  
  if (!scheme) {
    r = g = b = n * 255;
  } else if (scheme.type === 'gradient') {
    // Linear interpolation between stops
    const stops = scheme.stops;
    let color = stops[0];
    for (let j = 0; j < stops.length - 1; j++) {
      if (n >= stops[j].value && n <= stops[j + 1].value) {
        const t = (n - stops[j].value) / (stops[j + 1].value - stops[j].value);
        r = Math.round(stops[j].r + t * (stops[j + 1].r - stops[j].r));
        g = Math.round(stops[j].g + t * (stops[j + 1].g - stops[j].g));
        b = Math.round(stops[j].b + t * (stops[j + 1].b - stops[j].b));
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = 255;
        return;
      }
    }
    // Fallback to last stop
    color = stops[stops.length - 1];
    r = color.r;
    g = color.g;
    b = color.b;
  } else if (scheme.type === 'stops') {
    // Step through stops
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
  
  buf[i] = Math.max(0, Math.min(255, r));
  buf[i + 1] = Math.max(0, Math.min(255, g));
  buf[i + 2] = Math.max(0, Math.min(255, b));
  buf[i + 3] = 255;
}

// Main Render Loop
function render() {
  const visLayers = layers.filter(l => l.visible);
  
  if (!visLayers.length) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#444';
    ctx.font = '13px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('+ Add a layer to start', W / 2, H / 2);
    return;
  }
  
  const { res, color: cm, offsetX: gOffsetX, offsetY: gOffsetY, zoom, invert: inv, contour: ctr, warp } = gState;
  const z = zValue;
  const nL = visLayers.length;

  for (let y = 0; y < H; y += res) {
    for (let x = 0; x < W; x += res) {
      let final = 0;
      
      // Pipeline: each layer blends with accumulated result using its own blend mode
      for (let li = 0; li < nL; li++) {
        const l = visLayers[li];
        const blend = l.blend;
        const params = ensureLayerParams(l);
        
        let nx = (x + gOffsetX) * zoom + l.offsetX;
        let ny = (y + gOffsetY) * zoom + l.offsetY;
        let n = sampleNoise(l, nx, ny, z + l.z);
        n = n < 0 ? 0 : n > 1 ? 1 : n;
        const w = 1;
        
        // Apply per-layer blend mode
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
  
  // FPS Counter
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

// Layer Management
function mkLayer() {
  const layer = {
    id: uid++,
    type: 'perlin',
    seed: 0,
    z: 0,
    offsetX: 0,
    offsetY: 0,
    blend: 'avg',
    visible: true,
    collapsed: false,
    params: {}
  };
  ensureLayerParams(layer);
  return layer;
}

function buildCard(l, idx) {
  cacheBuiltInDefaults();
  const allTypes = [...NOISE_TYPES, ...Object.keys(customFns)];
  const card = document.createElement('div');
  card.className = 'layer-card';
  card.dataset.lid = l.id;

  const hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.innerHTML = `<span class="card-toggle">${l.collapsed ? '▸' : '▾'}</span><span class="drag-handle">⠿</span><span class="card-num">${idx + 1}</span><span class="card-title">Layer ${idx + 1}</span><span class="card-badge" id="badge_${l.id}">${l.type}</span><span class="card-eye${l.visible ? '' : ' hidden-layer'}" id="eye_${l.id}">${l.visible ? '●' : '○'}</span><span class="card-rm">✕</span>`;
  
  hdr.querySelector('.card-eye').addEventListener('click', e => {
    e.stopPropagation();
    l.visible = !l.visible;
    const eye = hdr.querySelector('.card-eye');
    eye.textContent = l.visible ? '●' : '○';
    if (l.visible) eye.classList.remove('hidden-layer');
    else eye.classList.add('hidden-layer');
    render();
  });
  
  hdr.querySelector('.card-rm').addEventListener('click', e => {
    e.stopPropagation();
    layers = layers.filter(x => x.id !== l.id);
    renderLayers();
  });

  // Collapse / expand toggle
  const toggle = hdr.querySelector('.card-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      l.collapsed = !l.collapsed;
      card.classList.toggle('collapsed', l.collapsed);
      // update toggle icon
      toggle.textContent = l.collapsed ? '▸' : '▾';
      const bodyEl = card.querySelector('.card-body');
      if (bodyEl) bodyEl.style.display = l.collapsed ? 'none' : '';
    });
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const row2 = document.createElement('div');
  row2.className = 'ctrl2';
  
  const tSel = document.createElement('select');
  allTypes.forEach(t => {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t;
    if (t === l.type) o.selected = true;
    tSel.appendChild(o);
  });
  tSel.addEventListener('change', () => {
    l.type = tSel.value;
    document.getElementById('badge_' + l.id).textContent = l.type;
    ensureLayerParams(l);
    applyDefaultsForType(l);
    renderLayers();
  });
    
  const bSel = document.createElement('select');
  ['avg', 'add', 'mul', 'max', 'min', 'diff'].forEach(b => {
    const o = document.createElement('option');
    o.value = b;
    o.textContent = b.charAt(0).toUpperCase() + b.slice(1);
    if (b === l.blend) o.selected = true;
    bSel.appendChild(o);
  });
  bSel.addEventListener('change', () => {
    l.blend = bSel.value;
    render();
  });
  
  row2.appendChild(tSel);
  row2.appendChild(bSel);

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit Params';
  editBtn.addEventListener('click', () => openParamEditor(l));
  row2.appendChild(editBtn);

  body.appendChild(row2);

  const createDraggableNumberControl = (lbl, getVal, setVal, opts = {}) => {
    const val = getVal();
    const d = document.createElement('div');
    d.className = 'ctrl';
    const minAttr = opts.min !== undefined && opts.min !== null ? ` min="${opts.min}"` : '';
    const maxAttr = opts.max !== undefined && opts.max !== null ? ` max="${opts.max}"` : '';
    const step = opts.step ?? 1;
    const prec = opts.prec ?? 0;
    d.innerHTML = `<label>${lbl}</label><input type="number" class="param-number" value="${val.toFixed(prec)}" step="${step}"${minAttr}${maxAttr} style="flex:1;padding:5px"><span class="val" style="min-width:0"></span>`;

    const inp = d.querySelector('input');
    let dragStart = 0;
    let isDragging = false;

    const applyVal = (v) => {
      let nv = v;
      if (opts.min !== undefined && opts.min !== null && nv < opts.min) nv = opts.min;
      if (opts.max !== undefined && opts.max !== null && nv > opts.max) nv = opts.max;
      setVal(nv);
      inp.value = nv.toFixed(prec);
      render();
    };

    const commitInputValue = () => {
      const raw = inp.value.trim();
      if (raw === '') return;
      const v = parseFloat(raw);
      applyVal(isNaN(v) ? 0 : v);
    };

    inp.addEventListener('input', () => {
      if (isDragging) return;
    });
    inp.addEventListener('change', commitInputValue);
    inp.addEventListener('blur', commitInputValue);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commitInputValue();
        inp.blur();
      } else if (e.key === 'Escape') {
        inp.value = getVal().toFixed(prec);
        inp.blur();
      }
    });

    inp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const stepVal = step || 1;
      const current = parseFloat(inp.value) || 0;
      applyVal(current + dir * stepVal);
    }, { passive: false });

    inp.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStart = e.clientY;
      inp.style.cursor = 'ns-resize';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging && d.contains(inp) && document.activeElement === inp) {
        const delta = dragStart - e.clientY;
        const scale = opts.dragScale ?? 0.5;
        const current = parseFloat(inp.value) || 0;
        const newVal = current + delta * scale;
        applyVal(newVal);
        dragStart = e.clientY;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      inp.style.cursor = 'default';
    });

    body.appendChild(d);
  };

  if (!l.fixedMeta || typeof l.fixedMeta !== 'object') l.fixedMeta = {};

  const getFixedMeta = (field, defaults) => {
    const meta = l.fixedMeta[field] || {};
    return {
      type: meta.type || defaults.type,
      min: typeof meta.min === 'number' ? meta.min : defaults.min,
      max: typeof meta.max === 'number' ? meta.max : defaults.max,
      step: typeof meta.step === 'number' ? meta.step : defaults.step,
      options: Array.isArray(meta.options) ? meta.options : defaults.options
    };
  };

  const renderFixedControl = (field, label, getVal, setVal, metaDefaults) => {
    const meta = getFixedMeta(field, metaDefaults);
    const current = getVal();
    const d = document.createElement('div');
    d.className = 'ctrl';

    if (meta.type === 'toggle') {
      d.innerHTML = `<label>${label}</label><input type="checkbox" ${current ? 'checked' : ''}>`;
      const inp = d.querySelector('input');
      inp.addEventListener('change', () => {
        setVal(inp.checked ? 1 : 0);
        render();
      });
      body.appendChild(d);
      return;
    }

    if (meta.type === 'select') {
      const options = Array.isArray(meta.options) && meta.options.length ? meta.options : ['0', '1'];
      const currentStr = String(current);
      d.innerHTML = `<label>${label}</label><select></select>`;
      const sel = d.querySelector('select');
      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === currentStr) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        const v = parseFloat(sel.value);
        setVal(isNaN(v) ? 0 : v);
        render();
      });
      body.appendChild(d);
      return;
    }

    const min = Number.isFinite(meta.min) ? meta.min : undefined;
    const max = Number.isFinite(meta.max) ? meta.max : undefined;
    const step = Number.isFinite(meta.step) ? meta.step : 0.01;
    const prec = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 2 : 0;
    const minAttr = min !== undefined ? ` min="${min}"` : '';
    const maxAttr = max !== undefined ? ` max="${max}"` : '';

    if (meta.type === 'range') {
      const rangeMin = min ?? 0;
      const rangeMax = max ?? 1;
      d.innerHTML = `<label>${label}</label><input type="range" min="${rangeMin}" max="${rangeMax}" step="${step}" value="${current}"><input type="number" class="param-number" min="${rangeMin}" max="${rangeMax}" step="${step}" value="${current.toFixed(prec)}" style="width:60px;padding:4px;margin-left:4px">`;
      const range = d.querySelector('input[type=range]');
      const num = d.querySelector('input[type=number]');
      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        setVal(v);
        num.value = v.toFixed(prec);
        render();
      });
      const commitValue = () => {
        const raw = num.value.trim();
        if (raw === '') return;
        const v = parseFloat(raw);
        const nv = isNaN(v) ? 0 : v;
        setVal(nv);
        range.value = String(nv);
        num.value = nv.toFixed(prec);
        render();
      };
      num.addEventListener('change', commitValue);
      num.addEventListener('blur', commitValue);
      num.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          commitValue();
          num.blur();
        } else if (e.key === 'Escape') {
          num.value = getVal().toFixed(prec);
          num.blur();
        }
      });
      body.appendChild(d);
      return;
    }

    createDraggableNumberControl(label, getVal, setVal, {
      min,
      max,
      step,
      prec,
      dragScale: step >= 1 ? 1 : step * 5
    });
  };

  // Base control (fixed signature param)
  renderFixedControl('seed', 'seed', () => l.seed, v => l.seed = v, { type: 'number', min: 0, max: 9999, step: 1, options: [] });

  // Params are fully dynamic (no hardcoded sliders)
  const params = ensureLayerParams(l);

  // Offset/Z controls with draggable number inputs
  renderFixedControl('offsetX', 'x', () => l.offsetX, v => l.offsetX = v, { type: 'number', min: null, max: null, step: 0.01, options: [] });
  renderFixedControl('offsetY', 'y', () => l.offsetY, v => l.offsetY = v, { type: 'number', min: null, max: null, step: 0.01, options: [] });
  renderFixedControl('z', 'z', () => l.z, v => l.z = v, { type: 'number', min: null, max: null, step: 0.01, options: [] });

  // Custom params (auto-generate UI from params + meta)
  const paramsMeta = l.paramsMeta || {};

  const getAutoRange = (key, val, meta) => {
    const mn = typeof meta?.min === 'number' ? meta.min : undefined;
    const mx = typeof meta?.max === 'number' ? meta.max : undefined;
    const st = typeof meta?.step === 'number' ? meta.step : undefined;
    if (mn !== undefined || mx !== undefined || st !== undefined) {
      return {
        min: mn ?? 0,
        max: mx ?? 1,
        step: st ?? 0.01
      };
    }

    const k = String(key).toLowerCase();
    if (k.includes('scale')) return { min: 1, max: Math.max(200, (Math.abs(val) || 1) * 4), step: 1 };
    if (k.includes('octave')) return { min: 1, max: 10, step: 1 };
    if (k.includes('falloff')) return { min: 0, max: 1, step: 0.01 };
    if (k.includes('warp')) return { min: 0, max: 2, step: 0.01 };
    if (k.includes('angle')) return { min: 0, max: 180, step: 1 };
    if (k.includes('contrast')) return { min: 0, max: 3, step: 0.01 };
    if (k.includes('threshold')) return { min: 0, max: 1, step: 0.01 };

    if (Number.isInteger(val)) return { min: 0, max: Math.max(10, Math.abs(val) * 4), step: 1 };
    if (val >= 0 && val <= 1) return { min: 0, max: 1, step: 0.01 };

    const span = Math.max(1, Math.abs(val) || 1);
    return { min: val - span, max: val + span, step: 0.01 };
  };

  Object.keys(params).forEach(key => {
    const meta = paramsMeta[key] || { type: typeof params[key] === 'boolean' ? 'toggle' : 'number' };
    const d = document.createElement('div');
    d.className = 'ctrl';

    if (meta.type === 'toggle') {
      d.innerHTML = `<label>${key}</label><input type="checkbox" ${params[key] ? 'checked' : ''}>`;
      const inp = d.querySelector('input');
      inp.addEventListener('change', () => {
        params[key] = inp.checked;
        render();
      });
    } else if (meta.type === 'select') {
      const options = Array.isArray(meta.options) ? meta.options : [];
      const current = params[key] ?? (options[0] ?? '');
      d.innerHTML = `<label>${key}</label><select></select>`;
      const sel = d.querySelector('select');
      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === current) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        params[key] = sel.value;
        render();
      });
    } else if (meta.type === 'range') {
      const currentVal = typeof params[key] === 'number' ? params[key] : 0;
      let { min, max, step } = { min:Number.NEGATIVE_INFINITY, max:Number.POSITIVE_INFINITY, step:0.01 } // getAutoRange(key, currentVal, meta);
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        const auto = getAutoRange(key, currentVal, {});
        min = auto.min;
        max = auto.max;
        step = auto.step;
      }
      const prec = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 2 : 0;
      d.innerHTML = `<label>${key}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${currentVal}"><input type="number" class="param-number" min="${min}" max="${max}" step="${step}" value="${currentVal.toFixed(prec)}" style="width:60px;padding:4px;margin-left:4px">`;
      const range = d.querySelector('input[type=range]');
      const num = d.querySelector('input[type=number]');

      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        params[key] = v;
        num.value = v.toFixed(prec);
        render();
      });

      num.addEventListener('wheel', (e) => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const stepVal = step || 0.01;
        const current = parseFloat(num.value) || 0;
        let v = current + dir * stepVal;
        if (v < min) v = min;
        if (v > max) v = max;
        params[key] = v;
        range.value = String(v);
        num.value = v.toFixed(prec);
        render();
      }, { passive: false });

      const commitParamValue = () => {
        const raw = num.value.trim();
        if (raw === '') return;
        const v = parseFloat(raw);
        const nv = isNaN(v) ? 0 : v;
        params[key] = nv;
        range.value = String(nv);
        num.value = nv.toFixed(prec);
        render();
      };

      num.addEventListener('input', () => {});
      num.addEventListener('change', commitParamValue);
      num.addEventListener('blur', commitParamValue);
      num.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          commitParamValue();
          num.blur();
        } else if (e.key === 'Escape') {
          num.value = (params[key] ?? 0).toFixed(prec);
          num.blur();
        }
      });
    } else if (meta.type === 'number') {
      const currentVal = typeof params[key] === 'number' ? params[key] : 0;
      const min = Number.isFinite(meta.min) ? meta.min : -Infinity;
      const max = Number.isFinite(meta.max) ? meta.max : Infinity;
      const step = Number.isFinite(meta.step) ? meta.step : 0.01;
      const prec = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 2 : 0;
      const minAttr = Number.isFinite(min) ? ` min="${min}"` : '';
      const maxAttr = Number.isFinite(max) ? ` max="${max}"` : '';
      d.innerHTML = `<label>${key}</label><input type="number" class="param-number"${minAttr}${maxAttr} step="${step}" value="${currentVal.toFixed(prec)}" style="flex:1;padding:5px"><span class="val" style="min-width:0"></span>`;
      const num = d.querySelector('input[type=number]');
      let dragStart = 0;
      let isDragging = false;

      const applyVal = (v) => {
        let nv = v;
        if (Number.isFinite(min) && nv < min) nv = min;
        if (Number.isFinite(max) && nv > max) nv = max;
        params[key] = nv;
        num.value = nv.toFixed(prec);
        render();
      };

      const commitParamValue = () => {
        const raw = num.value.trim();
        if (raw === '') return;
        const v = parseFloat(raw);
        applyVal(isNaN(v) ? 0 : v);
      };

      num.addEventListener('input', () => {
        if (isDragging) return;
      });
      num.addEventListener('change', commitParamValue);
      num.addEventListener('blur', commitParamValue);
      num.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          commitParamValue();
          num.blur();
        } else if (e.key === 'Escape') {
          num.value = (params[key] ?? 0).toFixed(prec);
          num.blur();
        }
      });

      num.addEventListener('wheel', (e) => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const stepVal = step || 0.01;
        const current = parseFloat(num.value) || 0;
        applyVal(current + dir * stepVal);
      }, { passive: false });

      num.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStart = e.clientY;
        num.style.cursor = 'ns-resize';
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging && d.contains(num) && document.activeElement === num) {
          const delta = dragStart - e.clientY;
          const dragScale = step >= 1 ? 0.5 : step * 5;
          const current = parseFloat(num.value) || 0;
          const newVal = current + delta * dragScale;
          applyVal(newVal);
          dragStart = e.clientY;
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
        num.style.cursor = 'default';
      });
    } else {
      d.innerHTML = `<label>${key}</label><input type="number" value="${params[key]}" style="flex:1;padding:5px"><span class="val" style="min-width:0"></span>`;
      const inp = d.querySelector('input');
      inp.addEventListener('input', () => {
        const v = parseFloat(inp.value) || 0;
        params[key] = v;
        render();
      });
    }

    body.appendChild(d);
  });

  card.appendChild(hdr);
  card.appendChild(body);

  if (l.collapsed) {
    body.style.display = 'none';
    card.classList.add('collapsed');
  }

  hdr.addEventListener('dragstart', e => {
    dragSrcId = l.id;
    setTimeout(() => card.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', l.id);
  });
  
  hdr.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.layer-card.drag-over').forEach(c => c.classList.remove('drag-over'));
  });
  
  card.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSrcId !== l.id) card.classList.add('drag-over');
  });
  
  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
  
  card.addEventListener('drop', e => {
    e.preventDefault();
    card.classList.remove('drag-over');
    if (dragSrcId === l.id) return;
    const fi = layers.findIndex(x => x.id === dragSrcId);
    const ti = layers.findIndex(x => x.id === l.id);
    if (fi < 0 || ti < 0) return;
    const [m] = layers.splice(fi, 1);
    layers.splice(ti, 0, m);
    renderLayers();
  });
  
  hdr.draggable = true;
  return card;
}

function renderLayers() {
  const list = document.getElementById('layers-list');
  list.innerHTML = '';
  layers.forEach((l, idx) => list.appendChild(buildCard(l, idx)));
  render();
}

function addLayer(l) {
  const layer = l ? normalizeLayer(l) : mkLayer();
  layers.push(layer);
  renderLayers();
}

// Custom Noise Injection
function injectCustom() {
  const src = document.getElementById('custom-src').value.trim();
  const msg = document.getElementById('inject-msg');
  msg.textContent = '';
  msg.className = 'msg';
  
  try {
    const fn = new Function('return (' + src + ')')();
    if (typeof fn !== 'function') throw new Error('Not a function');
    
    const m = src.match(/function\s+(\w+)/);
    const name = m ? m[1] : 'custom_' + Object.keys(customFns).length;
    customFns[name] = fn;

    const defaults = extractDefaultParamsFromSource(src);
    if (defaults && typeof defaults === 'object') {
      customFnParamDefaults[name] = defaults;
      const meta = {};
      Object.keys(defaults).forEach(k => {
        meta[k] = { type: typeof defaults[k] === 'boolean' ? 'toggle' : 'number' };
      });
      customFnParamMeta[name] = meta;
    }
    
    const l = mkLayer();
    l.type = name;
    applyDefaultsForType(l);
    addLayer(l);
    
    msg.textContent = name + ' injected! Signature: (x, y, z, seed, params) — add params via Custom Params';
    msg.className = 'msg ok';
  } catch (e) {
    msg.textContent = 'Error: ' + e.message + ' (check function signature)';
    msg.className = 'msg err';
  }
}

// Param Editor Modal
const paramEditorModal = document.getElementById('param-editor-modal');
const paramEditorList = document.getElementById('param-editor-list');
const paramEditorAdd = document.getElementById('param-editor-add');
const paramEditorSave = document.getElementById('param-editor-save');
const paramEditorCancel = document.getElementById('param-editor-cancel');
const paramEditorClose = document.getElementById('param-editor-close');

function getLayerById(id) {
  return layers.find(l => String(l.id) === String(id));
}

function renderParamEditor(layer) {
  if (!paramEditorList) return;
  paramEditorList.innerHTML = '';
  ensureLayerParams(layer);

  const addFixedRow = (label, field, value) => {
    if (!layer.fixedMeta || typeof layer.fixedMeta !== 'object') layer.fixedMeta = {};
    const meta = layer.fixedMeta[field] || { type: 'number', step: 0.01 };
    const row = document.createElement('div');
    row.className = 'param-row';
    row.dataset.fixedField = field;

    row.innerHTML = `
      <div>
        <div class="param-label">Name</div>
        <input class="param-name" value="${label}" disabled>
      </div>
      <div>
        <div class="param-label">Type</div>
        <select class="param-type">
          <option value="number">number</option>
          <option value="range">range</option>
          <option value="toggle">toggle</option>
          <option value="select">select</option>
        </select>
      </div>
      <div>
        <div class="param-label">Default</div>
        <input class="param-default" value="${value}">
      </div>
      <div>
        <div class="param-label">Min</div>
        <input class="param-min">
      </div>
      <div>
        <div class="param-label">Max</div>
        <input class="param-max">
      </div>
      <div>
        <div class="param-label">Step</div>
        <input class="param-step">
      </div>
      <div>
        <div class="param-label">Options (comma)</div>
        <input class="param-options">
      </div>
      <button class="param-remove" title="Remove" style="display:none">×</button>
    `;

    const typeSel = row.querySelector('.param-type');
    const minInp = row.querySelector('.param-min');
    const maxInp = row.querySelector('.param-max');
    const stepInp = row.querySelector('.param-step');
    const optInp = row.querySelector('.param-options');

    typeSel.value = meta.type || 'number';
    minInp.value = meta.min ?? '';
    maxInp.value = meta.max ?? '';
    stepInp.value = meta.step ?? '';
    optInp.value = Array.isArray(meta.options) ? meta.options.join(', ') : '';

    const refreshVisibility = () => {
      const t = typeSel.value;
      const showRange = t === 'range' || t === 'number';
      minInp.parentElement.style.display = showRange ? '' : 'none';
      maxInp.parentElement.style.display = showRange ? '' : 'none';
      stepInp.parentElement.style.display = showRange ? '' : 'none';
      optInp.parentElement.style.display = t === 'select' ? '' : 'none';
      if ((t === 'range' || t === 'number') && !stepInp.value) stepInp.value = '0.01';
    };
    refreshVisibility();
    typeSel.addEventListener('change', refreshVisibility);

    paramEditorList.appendChild(row);
  };

  // Fixed parameters (locked names)
  addFixedRow('x', 'offsetX', layer.offsetX ?? 0);
  addFixedRow('y', 'offsetY', layer.offsetY ?? 0);
  addFixedRow('z', 'z', layer.z ?? 0);
  addFixedRow('seed', 'seed', layer.seed ?? 0);

  const keys = Object.keys(layer.params);
  if (!keys.length) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = 'No params yet. Click “+ Add Param” to create one.';
    paramEditorList.appendChild(empty);
  }

  keys.forEach(key => {
    const meta = layer.paramsMeta?.[key] || { type: typeof layer.params[key] === 'boolean' ? 'toggle' : 'number' };
    const row = document.createElement('div');
    row.className = 'param-row';

    row.innerHTML = `
      <div>
        <div class="param-label">Name</div>
        <input class="param-name" value="${key}">
      </div>
      <div>
        <div class="param-label">Type</div>
        <select class="param-type">
          <option value="number">number</option>
          <option value="range">range</option>
          <option value="toggle">toggle</option>
          <option value="select">select</option>
        </select>
      </div>
      <div>
        <div class="param-label">Default</div>
        <input class="param-default">
      </div>
      <div>
        <div class="param-label">Min</div>
        <input class="param-min">
      </div>
      <div>
        <div class="param-label">Max</div>
        <input class="param-max">
      </div>
      <div>
        <div class="param-label">Step</div>
        <input class="param-step">
      </div>
      <div>
        <div class="param-label">Options (comma)</div>
        <input class="param-options">
      </div>
      <button class="param-remove" title="Remove">×</button>
    `;

    const typeSel = row.querySelector('.param-type');
    const defInp = row.querySelector('.param-default');
    const minInp = row.querySelector('.param-min');
    const maxInp = row.querySelector('.param-max');
    const stepInp = row.querySelector('.param-step');
    const optInp = row.querySelector('.param-options');
    const removeBtn = row.querySelector('.param-remove');

    typeSel.value = meta.type || 'number';
    defInp.value = layer.params[key];
    minInp.value = meta.min ?? '';
    maxInp.value = meta.max ?? '';
    stepInp.value = meta.step ?? '';
    optInp.value = Array.isArray(meta.options) ? meta.options.join(', ') : '';

    const refreshVisibility = () => {
      const t = typeSel.value;
      const showRange = t === 'range' || t === 'number';
      minInp.parentElement.style.display = showRange ? '' : 'none';
      maxInp.parentElement.style.display = showRange ? '' : 'none';
      stepInp.parentElement.style.display = showRange ? '' : 'none';
      optInp.parentElement.style.display = t === 'select' ? '' : 'none';
      if (t === 'toggle') {
        defInp.value = defInp.value === 'true' || defInp.value === 'false' ? defInp.value : 'false';
      }
      if ((t === 'range' || t === 'number') && !stepInp.value) {
        stepInp.value = '0.01';
      }
    };
    refreshVisibility();
    typeSel.addEventListener('change', refreshVisibility);

    removeBtn.addEventListener('click', () => row.remove());

    paramEditorList.appendChild(row);
  });
}

function openParamEditor(layer) {
  if (!paramEditorModal) return;
  paramEditorModal.dataset.lid = layer.id;
  renderParamEditor(layer);
  paramEditorModal.classList.remove('hidden');
}

if (paramEditorAdd) {
  paramEditorAdd.addEventListener('click', () => {
    if (!paramEditorList) return;
    const row = document.createElement('div');
    row.className = 'param-row';
    row.innerHTML = `
      <div>
        <div class="param-label">Name</div>
        <input class="param-name" value="param">
      </div>
      <div>
        <div class="param-label">Type</div>
        <select class="param-type">
          <option value="number">number</option>
          <option value="range">range</option>
          <option value="toggle">toggle</option>
          <option value="select">select</option>
        </select>
      </div>
      <div>
        <div class="param-label">Default</div>
        <input class="param-default" value="0">
      </div>
      <div>
        <div class="param-label">Min</div>
        <input class="param-min" value="0">
      </div>
      <div>
        <div class="param-label">Max</div>
        <input class="param-max" value="1">
      </div>
      <div>
        <div class="param-label">Step</div>
        <input class="param-step" value="0.01">
      </div>
      <div>
        <div class="param-label">Options (comma)</div>
        <input class="param-options" value="">
      </div>
      <button class="param-remove" title="Remove">×</button>
    `;
    row.querySelector('.param-remove').addEventListener('click', () => row.remove());
    paramEditorList.appendChild(row);
  });
}

function closeParamEditor() {
  if (paramEditorModal) paramEditorModal.classList.add('hidden');
}

if (paramEditorCancel) paramEditorCancel.addEventListener('click', closeParamEditor);
if (paramEditorClose) paramEditorClose.addEventListener('click', closeParamEditor);
if (paramEditorModal) {
  paramEditorModal.addEventListener('click', (e) => {
    if (e.target === paramEditorModal) closeParamEditor();
  });
}

if (paramEditorSave) {
  paramEditorSave.addEventListener('click', () => {
    const lid = paramEditorModal?.dataset?.lid;
    const layer = getLayerById(lid);
    if (!layer || !paramEditorList) return;

    const rows = Array.from(paramEditorList.querySelectorAll('.param-row'));
    const newParams = {};
    const newMeta = {};

    if (!layer.fixedMeta || typeof layer.fixedMeta !== 'object') layer.fixedMeta = {};

    rows.forEach(row => {
      const fixedField = row.dataset.fixedField;
      if (fixedField) {
        const type = row.querySelector('.param-type')?.value || 'number';
        const defValRaw = row.querySelector('.param-default')?.value;
        const minRaw = row.querySelector('.param-min')?.value;
        const maxRaw = row.querySelector('.param-max')?.value;
        const stepRaw = row.querySelector('.param-step')?.value;
        const optRaw = row.querySelector('.param-options')?.value;

        let val = defValRaw;
        if (type === 'toggle') {
          val = defValRaw === 'true' || defValRaw === true ? 1 : 0;
        } else {
          const v = parseFloat(defValRaw);
          val = isNaN(v) ? 0 : v;
        }

        if (fixedField === 'seed') layer.seed = Math.round(val);
        else if (fixedField === 'offsetX') layer.offsetX = val;
        else if (fixedField === 'offsetY') layer.offsetY = val;
        else if (fixedField === 'z') layer.z = val;

        const minVal = parseFloat(minRaw);
        const maxVal = parseFloat(maxRaw);
        const stepVal = parseFloat(stepRaw);
        const meta = { type };
        if (!isNaN(minVal)) meta.min = minVal;
        if (!isNaN(maxVal)) meta.max = maxVal;
        meta.step = !isNaN(stepVal) ? stepVal : 0.01;
        if (type === 'select') {
          meta.options = (optRaw || '').split(',').map(s => s.trim()).filter(Boolean);
        }
        layer.fixedMeta[fixedField] = meta;
        return;
      }
      const name = row.querySelector('.param-name')?.value?.trim();
      if (!name) return;
      const type = row.querySelector('.param-type')?.value || 'number';
      const defValRaw = row.querySelector('.param-default')?.value;
      const minRaw = row.querySelector('.param-min')?.value;
      const maxRaw = row.querySelector('.param-max')?.value;
      const stepRaw = row.querySelector('.param-step')?.value;
      const optRaw = row.querySelector('.param-options')?.value;

      let defVal = defValRaw;
      if (type === 'toggle') {
        defVal = defValRaw === 'true' || defValRaw === true;
      } else if (type === 'number' || type === 'range') {
        const n = parseFloat(defValRaw);
        defVal = isNaN(n) ? 0 : n;
      }

      newParams[name] = defVal;
      const meta = { type };
      if (type === 'range' || type === 'number') {
        const minVal = parseFloat(minRaw);
        const maxVal = parseFloat(maxRaw);
        const stepVal = parseFloat(stepRaw);
        if (!isNaN(minVal)) meta.min = minVal;
        if (!isNaN(maxVal)) meta.max = maxVal;
        meta.step = !isNaN(stepVal) ? stepVal : 0.01;
      }
      if (type === 'select') {
        const opts = (optRaw || '').split(',').map(s => s.trim()).filter(Boolean);
        meta.options = opts;
        if (!opts.includes(String(defVal))) {
          const fallback = opts[0] || '';
          newParams[name] = fallback;
        }
      }
      newMeta[name] = meta;
    });

    layer.params = newParams;
    layer.paramsMeta = newMeta;
    renderLayers();
    closeParamEditor();
  });
}

// ============================================================================
// EXPORT FUNCTIONS WITH BUNDLED NOISE-LIB
// ============================================================================

/**
 * Export as JavaScript with bundled NoiseLib
 */
function exportAsJS() {
  const projectName = currentProjectName || 'NoiseGenerator';
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Build custom function definitions
  let customFunctionsCode = '';
  let customFunctionsRegistry = '';
  for (const name in customFns) {
    customFunctionsCode += '\n  /**\n   * Custom injected function: ' + name + '\n   */\n  ' + customFns[name].toString() + '\n';
    customFunctionsRegistry += "    '" + name + "': " + name + ',\n';
  }
  
  // Get noise-lib source code from the noise-lib.js file
  let noiseLiBSource = '';
  
  // Fetch noise-lib.js synchronously for export
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'noise-lib.js', false);
  try {
    xhr.send();
    if (xhr.status === 200) {
      noiseLiBSource = xhr.responseText;
    } else {
      console.warn('Could not load noise-lib.js, using fallback');
      noiseLiBSource = '// ERROR: Could not load noise-lib.js';
    }
  } catch (e) {
    console.error('Error loading noise-lib.js:', e);
    noiseLiBSource = '// ERROR: ' + e.message;
  }
  
  const exportCode = `/*! ${projectName} - Optimized Noise Generator */
/* Built with bundled NoiseLib - Automatically loaded from noise-lib.js */

${noiseLiBSource}

// ============================================================================
// CUSTOM INJECTED FUNCTIONS
// ============================================================================
${customFunctionsCode}

// ============================================================================
// CONFIGURATION & RENDERING ENGINE
// ============================================================================

const ${sanitizedName} = (function() {
  const globalState = ${JSON.stringify(gState)};
  const layers = ${JSON.stringify(layers)};
  const customParamDefaults = ${JSON.stringify(customFnParamDefaults)};
  const customParamMeta = ${JSON.stringify(customFnParamMeta)};
  
  // Add custom functions to NoiseLib
  const customFunctions = {
${customFunctionsRegistry}
  };
  
  function sampleNoise(layer, x, y, z) {
    const params = layer.params || {};
    // Check custom functions first
    if (customFunctions[layer.type] && typeof customFunctions[layer.type] === 'function') {
      try {
        const v = customFunctions[layer.type](x, y, z, layer.seed, params);
        return isNaN(v) ? 0 : Math.max(0, Math.min(1, v));
      } catch (e) {
        console.error('Error in custom function ' + layer.type + ':', e);
        return 0;
      }
    }
    
    // Fall back to NoiseLib functions
    const noiseFn = NoiseLib.getNoiseFunction(layer.type);
    return noiseFn(x, y, z, layer.seed, params);
  }
  
  function getValue(x, y, z = 0) {
    const visLayers = layers.filter(layer => layer.visible);
    if (!visLayers.length) return 0.5;
    
    let final = 0;
    for (let li = 0; li < visLayers.length; li++) {
      const layer = visLayers[li];
      const params = layer.params || {};
      let nx = (x + globalState.offsetX) * globalState.zoom + layer.offsetX;
      let ny = (y + globalState.offsetY) * globalState.zoom + layer.offsetY;
      
      let n = sampleNoise(layer, nx, ny, z + layer.z);
      n = n < 0 ? 0 : n > 1 ? 1 : n;
      const w = 1;
      
      if (li === 0) {
        final = n * w;
      } else {
        const blend = layer.blend;
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
    
    if (globalState.invert) final = 1 - final;
    return final;
  }
  
  return {
    getValue,
    getState: () => ({...globalState}),
    getLayers: () => [...layers],
    getParamDefaults: () => ({...customParamDefaults}),
    getParamMeta: () => ({...customParamMeta}),
    NoiseLib,
    customFunctions,
    projectName: '${projectName}'
  };
})();

// Ensure the module is accessible on window
if (typeof window !== 'undefined') {
  window['${sanitizedName}'] = ${sanitizedName};
}

// Usage: ${sanitizedName}.getValue(x, y) or ${sanitizedName}.getValue(x, y, z)`;

  const blob = new Blob([exportCode], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizedName + '.js';
  a.click();
  URL.revokeObjectURL(url);
  
  document.getElementById('export-msg').textContent = 'Downloaded: ' + sanitizedName + '.js (with bundled NoiseLib)';
  document.getElementById('export-msg').className = 'msg ok';
}

// ============================================================================
// COLOR SCHEME MANAGEMENT
// ============================================================================

function openColorImportModal() {
  const modal = document.getElementById('color-io-modal');
  const titleEl = document.getElementById('color-io-title');
  const importSection = document.getElementById('color-import-section');
  const exportSection = document.getElementById('color-export-section');
  const fileInput = document.getElementById('color-io-file-input');
  const textarea = document.getElementById('color-io-textarea');
  const actionBtn = document.getElementById('color-io-action');
  const msgEl = document.getElementById('color-io-msg');
  
  titleEl.textContent = 'Import Color Schemes';
  importSection.style.display = 'block';
  exportSection.style.display = 'none';
  actionBtn.textContent = 'Import';
  fileInput.value = '';
  textarea.value = '';
  msgEl.style.display = 'none';
  
  actionBtn.onclick = () => {
    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (!data.colorSchemes) {
            msgEl.textContent = 'Invalid color schemes file';
            msgEl.className = 'msg err';
            msgEl.style.display = 'block';
            return;
          }
          Object.assign(colorSchemes, data.colorSchemes);
          updateColorSchemeSelect();
          render();
          msgEl.textContent = 'Color schemes imported successfully';
          msgEl.className = 'msg ok';
          msgEl.style.display = 'block';
          setTimeout(() => { modal.classList.add('hidden'); }, 1500);
        } catch (e) {
          msgEl.textContent = 'Error: ' + e.message;
          msgEl.className = 'msg err';
          msgEl.style.display = 'block';
        }
      };
      reader.readAsText(fileInput.files[0]);
    } else if (textarea.value.trim()) {
      try {
        const data = JSON.parse(textarea.value);
        if (!data.colorSchemes) {
          msgEl.textContent = 'Invalid color schemes JSON';
          msgEl.className = 'msg err';
          msgEl.style.display = 'block';
          return;
        }
        Object.assign(colorSchemes, data.colorSchemes);
        updateColorSchemeSelect();
        render();
        msgEl.textContent = 'Color schemes imported successfully';
        msgEl.className = 'msg ok';
        msgEl.style.display = 'block';
        setTimeout(() => { modal.classList.add('hidden'); }, 1500);
      } catch (e) {
        msgEl.textContent = 'Error: ' + e.message;
        msgEl.className = 'msg err';
        msgEl.style.display = 'block';
      }
    } else {
      msgEl.textContent = 'Please select a file or paste JSON';
      msgEl.className = 'msg err';
      msgEl.style.display = 'block';
    }
  };
  
  modal.classList.remove('hidden');
}

function openColorExportModal() {
  const modal = document.getElementById('color-io-modal');
  const titleEl = document.getElementById('color-io-title');
  const importSection = document.getElementById('color-import-section');
  const exportSection = document.getElementById('color-export-section');
  const nameInput = document.getElementById('color-export-name');
  const textarea = document.getElementById('color-export-textarea');
  const actionBtn = document.getElementById('color-io-action');
  const msgEl = document.getElementById('color-io-msg');
  
  titleEl.textContent = 'Export Color Schemes';
  importSection.style.display = 'none';
  exportSection.style.display = 'block';
  actionBtn.textContent = 'Download';
  nameInput.value = 'ColorSchemes';
  msgEl.style.display = 'none';
  
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    colorSchemes: colorSchemes
  };
  textarea.value = JSON.stringify(exportData, null, 2);
  
  actionBtn.onclick = () => {
    const name = nameInput.value || 'ColorSchemes';
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      colorSchemes: colorSchemes
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace(/[^a-zA-Z0-9_]/g, '_') + '_colorschemes.json';
    a.click();
    URL.revokeObjectURL(url);
    
    msgEl.textContent = 'Downloaded: ' + a.download;
    msgEl.className = 'msg ok';
    msgEl.style.display = 'block';
    setTimeout(() => { modal.classList.add('hidden'); }, 1500);
  };
  
  modal.classList.remove('hidden');
}

function importColorSchemes(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!data.colorSchemes) {
        showMessage('export-color-msg', 'Invalid color schemes file', 'err');
        return;
      }
      
      Object.assign(colorSchemes, data.colorSchemes);
      updateColorSchemeSelect();
      render();
      showMessage('export-color-msg', 'Color schemes imported successfully', 'ok');
    } catch (e) {
      showMessage('export-color-msg', 'Error: ' + e.message, 'err');
    }
  };
  reader.readAsText(file);
}

function showMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = text;
    el.className = 'msg ' + type;
  }
}

function updateColorSchemeSelect() {
  const select = document.getElementById('g-color');
  const currentValue = select.value;
  select.innerHTML = '';
  
  Object.keys(colorSchemes).forEach(key => {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = colorSchemes[key].name || key;
    select.appendChild(o);
  });
  
  if (colorSchemes[currentValue]) {
    select.value = currentValue;
  }
}

function editColorScheme() {
  const modal = document.getElementById('color-editor-modal');
  const nameInput = document.getElementById('color-scheme-name');
  const typeSelect = document.getElementById('color-scheme-type');
  const stopsList = document.getElementById('color-stops-list');
  const schemeSelect = document.getElementById('color-scheme-select');
  const previewDiv = document.getElementById('color-scheme-preview');
  
  let currentSchemeKey = null;
  let editingScheme = null;
  let dragSrcStop = null;
  
  // Populate dropdown with all color schemes
  schemeSelect.innerHTML = '';
  Object.keys(colorSchemes).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = colorSchemes[key].name || key;
    schemeSelect.appendChild(option);
  });
  
  // Auto-select the currently used color scheme
  const currentColor = gState.color || 'gray';
  schemeSelect.value = currentColor;
  
  // Load the selected scheme
  function loadScheme(key) {
    currentSchemeKey = key;
    editingScheme = JSON.parse(JSON.stringify(colorSchemes[key]));
    nameInput.value = editingScheme.name;
    typeSelect.value = editingScheme.type;
    renderStops();
    updatePreview();
  }
  
  // Handle scheme selection from dropdown
  schemeSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      loadScheme(e.target.value);
    }
  });
  
  // Load initial scheme
  loadScheme(currentColor);
  
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  function updatePreview() {
    const scheme = editingScheme;
    const canvas = document.createElement('canvas');
    const containerWidth = previewDiv.parentElement?.offsetWidth || previewDiv.offsetWidth || 600;
    canvas.width = Math.max(containerWidth, 300);
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    if (scheme.type === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      const stops = scheme.stops || [];
      stops.forEach(stop => {
        const color = `rgb(${stop.r}, ${stop.g}, ${stop.b})`;
        gradient.addColorStop(stop.value || 0, color);
      });
      ctx.fillStyle = gradient;
    } else if (scheme.type === 'stops') {
      const stops = scheme.stops || [];
      if (stops.length > 0) {
        for (let i = 0; i < canvas.width; i++) {
          const n = i / canvas.width;
          let color = stops[stops.length - 1];
          for (let j = 0; j < stops.length; j++) {
            if (n <= stops[j].value) {
              color = stops[j];
              break;
            }
          }
          ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.fillRect(i, 0, 1, canvas.height);
        }
      }
    }
    
    if (scheme.type === 'gradient') {
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    previewDiv.innerHTML = '';
    previewDiv.appendChild(canvas);
  }
  
  function renderStops() {
    stopsList.innerHTML = '';
    editingScheme.stops.forEach((stop, idx) => {
      const item = document.createElement('div');
      item.className = 'color-stop-item';
      item.draggable = true;
      item.dataset.index = idx;
      
      const hex = rgbToHex(stop.r, stop.g, stop.b);
      
      item.innerHTML = `
        <span class="color-stop-drag">⠿</span>
        <input type="color" class="color-stop-preview" value="${hex}">
        <div class="color-stop-controls">
          <label style="font-size:11px;color:var(--text3);min-width:45px">Value:</label>
          <input type="number" class="stop-value" min="0" max="1" step="0.01" value="${stop.value.toFixed(2)}">
          <label style="font-size:11px;color:var(--text3);min-width:15px">Op:</label>
          <select class="stop-op" style="width:50px;padding:4px;font-size:12px;background:var(--bg1);border:1px solid var(--border2);border-radius:3px;color:var(--text)">
            <option value="lte" ${!stop.op || stop.op === 'lte' ? 'selected' : ''}>≤</option>
            <option value="eq" ${stop.op === 'eq' ? 'selected' : ''}>==</option>
            <option value="gte" ${stop.op === 'gte' ? 'selected' : ''}>≥</option>
          </select>
        </div>
        <button class="color-stop-remove">Remove</button>
      `;
      
      // Color picker
      const colorInput = item.querySelector('input[type=color]');
      colorInput.addEventListener('change', (e) => {
        const rgb = hexToRgb(e.target.value);
        if (rgb) {
          stop.r = rgb.r;
          stop.g = rgb.g;
          stop.b = rgb.b;
          updatePreview();
        }
      });
      
      // Value input
      const valueInput = item.querySelector('.stop-value');
      valueInput.addEventListener('input', (e) => {
        stop.value = parseFloat(e.target.value) || 0;
        updatePreview();
      });
      
      // Operator select
      const opSelect = item.querySelector('.stop-op');
      opSelect.addEventListener('change', (e) => {
        stop.op = e.target.value;
      });
      
      // Remove button
      const removeBtn = item.querySelector('.color-stop-remove');
      removeBtn.addEventListener('click', () => {
        editingScheme.stops.splice(idx, 1);
        renderStops();
        updatePreview();
      });
      
      // Drag events
      item.addEventListener('dragstart', (e) => {
        dragSrcStop = idx;
        item.classList.add('dragging');
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.color-stop-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragSrcStop !== idx) item.classList.add('drag-over');
      });
      
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (dragSrcStop !== null && dragSrcStop !== idx) {
          const [stop] = editingScheme.stops.splice(dragSrcStop, 1);
          editingScheme.stops.splice(idx, 0, stop);
          dragSrcStop = null;
          renderStops();
          updatePreview();
        }
      });
      
      stopsList.appendChild(item);
    });
  }
  
  renderStops();
  updatePreview();
  
  // Add stop button
  document.getElementById('add-color-stop-btn').onclick = () => {
    editingScheme.stops.push({
      value: 0.5,
      r: 128,
      g: 128,
      b: 128,
      op: 'lte'
    });
    editingScheme.stops.sort((a, b) => a.value - b.value);
    renderStops();
    updatePreview();
  };
  
  // New scheme button
  document.getElementById('color-scheme-new-btn').onclick = () => {
    const schemeName = prompt('Enter name for new color scheme:', 'New Scheme');
    if (schemeName === null) return;
    
    const schemeKey = 'custom_' + Date.now();
    currentSchemeKey = schemeKey;
    editingScheme = {
      name: schemeName || 'New Scheme',
      type: 'gradient',
      stops: [
        { value: 0, r: 0, g: 0, b: 0 },
        { value: 1, r: 255, g: 255, b: 255 }
      ]
    };
    
    // Add to color schemes temporarily
    colorSchemes[schemeKey] = editingScheme;
    
    // Add option to select dropdown
    const option = document.createElement('option');
    option.value = schemeKey;
    option.textContent = editingScheme.name;
    schemeSelect.appendChild(option);
    schemeSelect.value = schemeKey;
    
    nameInput.value = editingScheme.name;
    typeSelect.value = editingScheme.type;
    renderStops();
    updatePreview();
  };
  
  // Type change updates preview
  typeSelect.addEventListener('change', () => {
    editingScheme.type = typeSelect.value;
    updatePreview();
  });
  
  // Save button
  document.getElementById('color-editor-save').onclick = () => {
    editingScheme.name = nameInput.value || 'Custom';
    editingScheme.type = typeSelect.value;
    
    const schemeKey = currentSchemeKey;
    colorSchemes[schemeKey] = editingScheme;
    
    // Update the select dropdown label if name changed
    const option = schemeSelect.querySelector(`option[value="${schemeKey}"]`);
    if (option) {
      option.textContent = editingScheme.name;
    }
    
    updateColorSchemeSelect();
    document.getElementById('g-color').value = schemeKey;
    render();
    
    modal.classList.add('hidden');
    showMessage('export-color-msg', 'Color scheme saved: ' + editingScheme.name, 'ok');
  };
  
  // Close button
  document.getElementById('color-editor-close').onclick = () => {
    modal.classList.add('hidden');
  };
  
  document.getElementById('color-editor-cancel').onclick = () => {
    modal.classList.add('hidden');
  };
  
  // Add resize observer to make preview responsive
  const resizeObserver = new ResizeObserver(() => {
    updatePreview();
  });
  resizeObserver.observe(previewDiv.parentElement);
  
  // Clean up observer when modal closes
  const originalCloseHandler = document.getElementById('color-editor-close').onclick;
  document.getElementById('color-editor-close').onclick = () => {
    resizeObserver.disconnect();
    originalCloseHandler();
  };
  
  const originalCancelHandler = document.getElementById('color-editor-cancel').onclick;
  document.getElementById('color-editor-cancel').onclick = () => {
    resizeObserver.disconnect();
    originalCancelHandler();
  };
  
  modal.classList.remove('hidden');
}

function openNoiseImportModal() {
  const modal = document.getElementById('noise-io-modal');
  const titleEl = document.getElementById('noise-io-title');
  const importSection = document.getElementById('noise-import-section');
  const exportSection = document.getElementById('noise-export-section');
  const fileInput = document.getElementById('noise-io-file-input');
  const textarea = document.getElementById('noise-io-textarea');
  const actionBtn = document.getElementById('noise-io-action');
  const copyBtn = document.getElementById('noise-io-copy');
  const downloadBtn = document.getElementById('noise-io-download');
  const msgEl = document.getElementById('noise-io-msg');
  
  titleEl.textContent = 'Import Configuration';
  importSection.style.display = 'block';
  exportSection.style.display = 'none';
  actionBtn.textContent = 'Import';
  actionBtn.style.display = 'inline-block';
  copyBtn.style.display = 'none';
  downloadBtn.style.display = 'none';
  fileInput.value = '';
  textarea.value = '';
  msgEl.style.display = 'none';
  
  actionBtn.onclick = () => {
    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        loadNoiseConfiguration(event.target.result, modal, msgEl);
      };
      reader.readAsText(fileInput.files[0]);
    } else if (textarea.value.trim()) {
      loadNoiseConfiguration(textarea.value, modal, msgEl);
    } else {
      msgEl.textContent = 'Please select a file or paste JSON';
      msgEl.className = 'msg err';
      msgEl.style.display = 'block';
    }
  };
  
  modal.classList.remove('hidden');
}

function openNoiseExportModal() {
  const modal = document.getElementById('noise-io-modal');
  const titleEl = document.getElementById('noise-io-title');
  const importSection = document.getElementById('noise-import-section');
  const exportSection = document.getElementById('noise-export-section');
  const nameInput = document.getElementById('noise-export-name');
  const textarea = document.getElementById('noise-export-textarea');
  const actionBtn = document.getElementById('noise-io-action');
  const copyBtn = document.getElementById('noise-io-copy');
  const downloadBtn = document.getElementById('noise-io-download');
  const msgEl = document.getElementById('noise-io-msg');
  
  titleEl.textContent = 'Export Configuration';
  importSection.style.display = 'none';
  exportSection.style.display = 'block';
  actionBtn.style.display = 'none';
  copyBtn.style.display = 'inline-block';
  downloadBtn.style.display = 'inline-block';
  nameInput.value = 'NoiseConfig';
  msgEl.style.display = 'none';
  
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    projectName: 'NoiseConfig',
    description: 'Noise mixer configuration exported from Noise Mixer',
    globalState: gState,
    layers: layers,
    colorSchemes: colorSchemes,
    customFunctions: Object.keys(customFns).map(name => ({
      name,
      code: customFns[name].toString()
    }))
  };
  textarea.value = JSON.stringify(exportData, null, 2);
  
  copyBtn.onclick = () => {
    textarea.select();
    document.execCommand('copy');
    msgEl.textContent = 'JSON copied to clipboard';
    msgEl.className = 'msg ok';
    msgEl.style.display = 'block';
  };
  
  downloadBtn.onclick = () => {
    const name = nameInput.value || 'NoiseConfig';
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      projectName: name,
      description: 'Noise mixer configuration exported from Noise Mixer',
      globalState: gState,
      layers: layers,
      colorSchemes: colorSchemes,
      customFunctions: Object.keys(customFns).map(cf => ({
        name: cf,
        code: customFns[cf].toString()
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace(/[^a-zA-Z0-9_]/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    
    msgEl.textContent = 'Downloaded: ' + a.download;
    msgEl.className = 'msg ok';
    msgEl.style.display = 'block';
    setTimeout(() => { modal.classList.add('hidden'); }, 1500);
  };
  
  modal.classList.remove('hidden');
}

function loadNoiseConfiguration(jsonString, modal, msgEl) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.globalState || !data.layers) {
      msgEl.textContent = 'Invalid configuration format';
      msgEl.className = 'msg err';
      msgEl.style.display = 'block';
      return;
    }
    
    Object.assign(gState, data.globalState);
    
    if (data.colorSchemes && typeof data.colorSchemes === 'object') {
      Object.assign(colorSchemes, data.colorSchemes);
    }
    
    if (data.customFunctions && Array.isArray(data.customFunctions)) {
      data.customFunctions.forEach(cf => {
        try {
          customFns[cf.name] = new Function('return (' + cf.code + ')')();
        } catch (e) {
          console.warn('Failed to restore custom function ' + cf.name + ':', e);
        }
      });
    }
    
    layers = data.layers.map(l => normalizeLayer({ ...l, id: uid++ }));
    
    document.getElementById('g-color').value = gState.color;
    document.getElementById('g-res').value = gState.res;
    document.getElementById('g-zoom').value = gState.zoom;
    document.getElementById('zoom-val').textContent = gState.zoom.toFixed(1) + 'x';
    document.getElementById('g-panx').value = gState.offsetX;
    document.getElementById('g-pany').value = gState.offsetY;
    document.getElementById('menu-theme').classList.toggle('on', gState.invert);
    
    renderLayers();
    msgEl.textContent = 'Configuration loaded successfully';
    msgEl.className = 'msg ok';
    msgEl.style.display = 'block';
    setTimeout(() => { modal.classList.add('hidden'); }, 1500);
  } catch (e) {
    msgEl.textContent = 'Error: ' + e.message;
    msgEl.className = 'msg err';
    msgEl.style.display = 'block';
  }
}

function exportAsJSON() {
  openNoiseExportModal();
}

// Event Listeners - Global Controls
document.getElementById('g-color').addEventListener('change', e => {
  gState.color = e.target.value;
  render();
});
document.getElementById('g-res').addEventListener('change', e => {
  gState.res = parseInt(e.target.value);
  render();
});

const zoomSlider = document.getElementById('g-zoom');
if (zoomSlider) {
  zoomSlider.addEventListener('input', e => {
    gState.zoom = parseFloat(e.target.value);
    dirtyStateFields.add('zoom');
    document.getElementById('zoom-val').textContent = gState.zoom.toFixed(1) + 'x';
    render();
  });
}

const zSlider = document.getElementById('g-z');
if (zSlider) {
  zSlider.addEventListener('input', e => {
    zValue = parseFloat(e.target.value);
    document.getElementById('z-val').textContent = zValue.toFixed(1);
    render();
  });
}

// Pan input handlers
const panXInput = document.getElementById('g-panx');
const panYInput = document.getElementById('g-pany');
let isDraggingPan = { x: false, y: false };
let panDragStart = { x: 0, y: 0 };

if (panXInput) {
  panXInput.addEventListener('input', e => {
    gState.offsetX = parseFloat(e.target.value) || 0;
    render();
  });
  panXInput.addEventListener('mousedown', (e) => {
    isDraggingPan.x = true;
    panDragStart.x = e.clientX;
  });
}

if (panYInput) {
  panYInput.addEventListener('input', e => {
    gState.offsetY = parseFloat(e.target.value) || 0;
    render();
  });
  panYInput.addEventListener('mousedown', (e) => {
    isDraggingPan.y = true;
    panDragStart.y = e.clientY;
  });
}

document.addEventListener('mousemove', (e) => {
  if (isDraggingPan.x) {
    const delta = e.clientX - panDragStart.x;
    const newVal = (parseFloat(panXInput.value) || 0) + delta * 0.1;
    panXInput.value = newVal.toFixed(1);
    gState.offsetX = newVal;
    panDragStart.x = e.clientX;
    render();
  }
  if (isDraggingPan.y) {
    const delta = e.clientY - panDragStart.y;
    const newVal = (parseFloat(panYInput.value) || 0) + delta * 0.1;
    panYInput.value = newVal.toFixed(1);
    gState.offsetY = newVal;
    panDragStart.y = e.clientY;
    render();
  }
});

document.addEventListener('mouseup', () => {
  isDraggingPan.x = false;
  isDraggingPan.y = false;
});

// Event Listeners - Buttons
document.getElementById('add-btn').addEventListener('click', () => addLayer());
document.getElementById('inject-btn').addEventListener('click', injectCustom);
document.getElementById('example-btn').addEventListener('click', () => {
  document.getElementById('custom-src').value = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
});
document.getElementById('edit-color-btn').addEventListener('click', editColorScheme);
document.getElementById('export-color-btn').addEventListener('click', openColorExportModal);
document.getElementById('edit-color-schemes-btn').addEventListener('click', editColorScheme);

// Color scheme import/export modal handlers
document.getElementById('import-color-btn').addEventListener('click', openColorImportModal);
document.getElementById('color-io-close').addEventListener('click', () => {
  document.getElementById('color-io-modal').classList.add('hidden');
});
document.getElementById('color-io-cancel').addEventListener('click', () => {
  document.getElementById('color-io-modal').classList.add('hidden');
});

// Noise configuration import/export modal handlers - called from menu
// (functions are now called directly from menu bar)
document.getElementById('noise-io-close').addEventListener('click', () => {
  document.getElementById('noise-io-modal').classList.add('hidden');
});
document.getElementById('noise-io-cancel').addEventListener('click', () => {
  document.getElementById('noise-io-modal').classList.add('hidden');
});

// Light Mode Toggle with error handling
document.addEventListener('DOMContentLoaded', () => {
  const lightModeBtn = document.getElementById('menu-theme');
  if (lightModeBtn) {
    lightModeBtn.addEventListener('click', () => {
      const on = lightModeBtn.classList.toggle('on');
      if (on) {
        document.documentElement.classList.add('light-mode');
        lightModeBtn.textContent = 'Dark';
        localStorage.setItem('lightMode', 'true');
      } else {
        document.documentElement.classList.remove('light-mode');
        lightModeBtn.textContent = 'Light';
        localStorage.removeItem('lightMode');
      }
    });
    
    // Restore light mode preference
    if (localStorage.getItem('lightMode') === 'true') {
      document.documentElement.classList.add('light-mode');
      lightModeBtn.classList.add('on');
      lightModeBtn.textContent = 'Dark';
    }
  }
});

// Canvas Pan and Zoom
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartOffsetX = gState.offsetX;
    panStartOffsetY = gState.offsetY;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isPanning) {
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    gState.offsetX = panStartOffsetX - dx / gState.zoom;
    gState.offsetY = panStartOffsetY - dy / gState.zoom;
    panXInput.value = gState.offsetX.toFixed(1);
    panYInput.value = gState.offsetY.toFixed(1);
    render();
  }
});

canvas.addEventListener('mouseup', () => {
  isPanning = false;
});

canvas.addEventListener('mouseleave', () => {
  isPanning = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  gState.zoom *= zoomFactor;
  gState.zoom = Math.max(0.1, Math.min(10, gState.zoom));
  document.getElementById('g-zoom').value = gState.zoom;
  document.getElementById('zoom-val').textContent = gState.zoom.toFixed(1) + 'x';
  render();
});

// About Modal
const aboutBtn = document.getElementById('t-about');
const aboutModal = document.getElementById('about-modal');
const modalClose = document.getElementById('modal-close');

if (aboutBtn) {
  aboutBtn.addEventListener('click', () => {
    aboutModal.classList.remove('hidden');
  });
}

if (modalClose) {
  modalClose.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
  });
}

if (aboutModal) {
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.add('hidden');
    }
  });
}

// Custom Noise Modal
const customNoiseBtn = document.getElementById('custom-noise-btn');
const customNoiseModal = document.getElementById('custom-noise-modal');
const customNoiseClose = document.getElementById('custom-noise-close');

if (customNoiseBtn) {
  customNoiseBtn.addEventListener('click', () => {
    customNoiseModal.classList.remove('hidden');
  });
}

if (customNoiseClose) {
  customNoiseClose.addEventListener('click', () => {
    customNoiseModal.classList.add('hidden');
  });
}

if (customNoiseModal) {
  customNoiseModal.addEventListener('click', (e) => {
    if (e.target === customNoiseModal) {
      customNoiseModal.classList.add('hidden');
    }
  });
}



// Color Schemes Modal
const colorSchemesBtn = document.getElementById('color-schemes-btn');
const colorSchemesModal = document.getElementById('color-schemes-modal');
const colorSchemesClose = document.getElementById('color-schemes-close');

if (colorSchemesBtn) {
  colorSchemesBtn.addEventListener('click', () => {
    colorSchemesModal.classList.remove('hidden');
  });
}

if (colorSchemesClose) {
  colorSchemesClose.addEventListener('click', () => {
    colorSchemesModal.classList.add('hidden');
  });
}

if (colorSchemesModal) {
  colorSchemesModal.addEventListener('click', (e) => {
    if (e.target === colorSchemesModal) {
      colorSchemesModal.classList.add('hidden');
    }
  });
}

// Menu Bar Functionality
let currentProjectName = 'Untitled Project';
const projectNameDisplay = document.getElementById('project-name-display');
const projectNameInput = document.getElementById('project-name-input');

// Project name editing
projectNameDisplay.addEventListener('click', () => {
  projectNameInput.value = currentProjectName;
  projectNameInput.style.display = 'inline-block';
  projectNameDisplay.style.display = 'none';
  projectNameInput.focus();
});

projectNameInput.addEventListener('blur', () => {
  currentProjectName = projectNameInput.value || 'Untitled Project';
  projectNameDisplay.textContent = currentProjectName;
  projectNameDisplay.style.display = 'inline-block';
  projectNameInput.style.display = 'none';
});

projectNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    projectNameInput.blur();
  } else if (e.key === 'Escape') {
    projectNameInput.style.display = 'none';
    projectNameDisplay.style.display = 'inline-block';
  }
});

// File Menu - New
document.getElementById('menu-new').addEventListener('click', () => {
  if (confirm('Create a new project? Current work will be lost if not saved.')) {
    const projectName = prompt('Enter project name:', 'My Project');
    if (projectName) {
      currentProjectName = projectName;
      projectNameDisplay.textContent = currentProjectName;
      // Reset all layers and state
      layers = [];
      gState.zoom = 1;
      gState.panx = 0;
      gState.pany = 0;
      gState.z = 0;
      gState.color = 'gray';
      gState.res = 2;
      // Reset UI controls
      document.getElementById('g-zoom').value = 1;
      document.getElementById('zoom-val').textContent = '1x';
      document.getElementById('g-z').value = 0;
      document.getElementById('z-val').textContent = '0.0';
      document.getElementById('g-panx').value = 0;
      document.getElementById('g-pany').value = 0;
      document.getElementById('g-color').value = 'gray';
      document.getElementById('g-res').value = 2;
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      // Render and add first layer
      renderLayers();
      addLayer();
    }
  }
});

// File Menu - Save
document.getElementById('menu-save').addEventListener('click', () => {
  saveProject();
});

// File Menu - Load
document.getElementById('menu-load').addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      loadProject(event.target.result)
        .then(msg => alert(msg))
        .catch(err => alert(err.message));
    };
    reader.readAsText(file);
  });
  fileInput.click();
});

// File Menu - Build
document.getElementById('menu-build').addEventListener('click', () => {
  exportAsJS();
});

// Edit Menu - Import Color Schema
document.getElementById('menu-import-colors').addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      loadColorSchemes(event.target.result)
        .then(msg => {
          alert(msg);
          updateColorSchemesDropdown();
        })
        .catch(err => alert(err.message));
    };
    reader.readAsText(file);
  });
  fileInput.click();
});

// Edit Menu - Export Color Schema
document.getElementById('menu-export-colors').addEventListener('click', () => {
  saveColorSchemes();
});

// Edit Menu - Theme/Application
// (Theme toggle implemented as checkbox switch; handler wired in initialization below)

// About Menu - About Application
document.getElementById('menu-about').addEventListener('click', () => {
  const aboutModal = document.getElementById('about-modal');
  aboutModal.classList.remove('hidden');
});

// Initialize
addLayer();

// Theme toggle initialization: persist preference in localStorage and apply
(function initThemeToggle(){
  const themeCheckbox = document.getElementById('menu-theme');
  if (!themeCheckbox) return;

  // Apply saved preference: 'light' => light mode on
  const pref = localStorage.getItem('nm_theme');
  const isLight = pref === 'light';
  if (isLight) document.documentElement.classList.add('light-mode');
  else document.documentElement.classList.remove('light-mode');
  themeCheckbox.checked = isLight;

  themeCheckbox.addEventListener('change', () => {
    const on = themeCheckbox.checked;
    if (on) {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('nm_theme', 'light');
    } else {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('nm_theme', 'dark');
    }
  });

  // Global controls collapse toggle
  const globalControlsCard = document.getElementById('global-controls-card');
  if (globalControlsCard) {
    const toggle = globalControlsCard.querySelector('.card-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        globalControlsCard.classList.toggle('collapsed');
        toggle.textContent = globalControlsCard.classList.contains('collapsed') ? '▸' : '▼';
        const bodyEl = globalControlsCard.querySelector('.card-body');
        if (bodyEl) bodyEl.style.display = globalControlsCard.classList.contains('collapsed') ? 'none' : '';
      });
    }
  }
})();
