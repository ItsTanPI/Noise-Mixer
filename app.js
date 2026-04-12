// Noise Mixer - Main Application Script using Noise Library

// Example noise functions
const EXAMPLES = [
  `function ripple(x, y, z, sc, octaves, falloff, seed, weight, contrast, threshold) {
  let r = Math.sqrt((x - 240) ** 2 + (y - 180) ** 2);
  return (Math.sin(r / sc - z * 3) + 1) / 2;
}`,
  `function spiral(x, y, z, sc, octaves, falloff, seed, weight, contrast, threshold) {
  let dx = x - 240, dy = y - 180;
  let a = Math.atan2(dy, dx), r = Math.sqrt(dx*dx + dy*dy);
  return (Math.sin(a * 4 + r / sc - z * 2) + 1) / 2;
}`,
  `function tartan(x, y, z, sc, octaves, falloff, seed, weight, contrast, threshold) {
  return ((Math.sin(x / sc + z) * Math.sin(y / sc + z)) + 1) / 2;
}`,
  `function plasma2(x, y, z, sc, octaves, falloff, seed, weight, contrast, threshold) {
  return (Math.sin(x/sc) + Math.sin(y/sc) + Math.sin((x+y)/sc) + Math.sin(Math.sqrt(x*x+y*y)/sc + z)) / 4 * 0.5 + 0.5;
}`,
  `function zigzag(x, y, z, sc, octaves, falloff, seed, weight, contrast, threshold) {
  let v = Math.sin(x / sc + z) * 0.5 + 0.5;
  return Math.abs(2 * v - 1);
}`
];

// Constants - Noise types loaded from NoiseLib
const NOISE_TYPES = NoiseLib.types;
const MASK_TYPES = ['none', 'circle', 'square', 'hex', 'diamond', 'ring', 'gradient_x', 'gradient_y'];

// Canvas Setup - Responsive sizing
const isMobile = window.innerWidth <= 900;
const W_BASE = isMobile ? 2 : 0.65;  // Full width on mobile, 65% on desktop
const H_BASE = isMobile ? 0.5 : 0.95;  // 50% height on mobile, 95% on desktop
let W = Math.floor(window.innerWidth * W_BASE);
let H = Math.floor(window.innerHeight * H_BASE);
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

// Handle window resize with responsive recalculation
window.addEventListener('resize', () => {
  const isMobileNow = window.innerWidth <= 900;
  const newW_BASE = isMobileNow ? 1.0 : 0.65;
  const newH_BASE = isMobileNow ? 0.5 : 0.95;
  W = Math.floor(window.innerWidth * newW_BASE);
  H = Math.floor(window.innerHeight * newH_BASE);
  canvas.width = W;
  canvas.height = H;
});

const imgData = ctx.createImageData(W, H);
const buf = imgData.data;

// Global State
const gState = {
  res: 2,
  color: 'gray',
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  invert: false,
  contour: false,
  warp: false
};

let zAuto = 0;
let zValue = 0;
let uid = 0;
let layers = [];
const customFns = {};
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
  const noiseFn = NoiseLib.getNoiseFunction(l.type);
  
  if (customFns[l.type]) {
    try {
      const v = +customFns[l.type](x, y, z, l.scale, l.octaves, l.falloff, l.seed, l.weight, l.contrast, l.threshold);
      return isNaN(v) ? 0 : Math.max(0, Math.min(1, v));
    } catch (e) {
      return 0;
    }
  }
  
  return noiseFn(x, y, z, l.scale, l.octaves, l.falloff, l.seed, l.weight, l.contrast, l.threshold);
}

// Mask Application
function applyMask(mask, x, y) {
  switch (mask) {
    case 'circle': {
      const dx = x / W - 0.5;
      const dy = y / H - 0.5;
      return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.5);
    }
    case 'square': {
      const dx = Math.abs(x / W - 0.5);
      const dy = Math.abs(y / H - 0.5);
      return Math.max(0, 1 - Math.max(dx, dy) * 2.5);
    }
    case 'hex': {
      const a = Math.abs(x / W - 0.5);
      const b = Math.abs(y / H - 0.5);
      return Math.max(0, 1 - Math.max(a * 2, b * 2, (a + b) * 1.15) * 2.2);
    }
    case 'diamond': {
      const dx = Math.abs(x / W - 0.5);
      const dy = Math.abs(y / H - 0.5);
      return Math.max(0, 1 - (dx + dy) * 2.2);
    }
    case 'ring': {
      const dx = x / W - 0.5;
      const dy = y / H - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);
      return Math.max(0, 1 - Math.abs(r - 0.28) * 8);
    }
    case 'gradient_x':
      return x / W;
    case 'gradient_y':
      return y / H;
    default:
      return 1;
  }
}

// Colorization
function colorize(n, cm, buf, i) {
  let r, g, b;
  
  switch (cm) {
    case 'gray':
      r = g = b = n * 255;
      break;
    
    case 'terrain':
      if (n < 0.35) {
        r = 30; g = 80; b = 200;
      } else if (n < 0.42) {
        r = 210; g = 190; b = 130;
      } else if (n < 0.7) {
        r = Math.min(255, 60 + n * 80);
        g = Math.min(255, 120 + n * 60);
        b = 40;
      } else if (n < 0.85) {
        r = 100; g = 90; b = 80;
      } else {
        r = 240; g = 240; b = 245;
      }
      break;
    
    case 'heat':
      r = Math.min(255, n * 3 * 255);
      g = Math.max(0, Math.min(255, (n * 3 - 1) * 255));
      b = Math.max(0, Math.min(255, (n * 3 - 2) * 255));
      break;
    
    case 'plasma':
      r = Math.sin(n * 6.28) * 127 + 128;
      g = Math.sin(n * 6.28 + 2) * 127 + 128;
      b = Math.sin(n * 6.28 + 4) * 127 + 128;
      break;
    
    case 'ice':
      r = Math.min(255, n * 80 + 40);
      g = Math.min(255, n * 160 + 80);
      b = Math.min(255, n * 255);
      break;
    
    case 'neon':
      r = Math.sin(n * 3.14) * 200 + 55;
      g = Math.sin(n * 3.14 + 2.1) * 200 + 55;
      b = Math.sin(n * 3.14 + 4.2) * 200 + 55;
      break;
    
    default:
      r = g = b = n * 255;
  }
  
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
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
        
        let nx = (x + gOffsetX) * zoom + l.offsetX;
        let ny = (y + gOffsetY) * zoom + l.offsetY;
        if (warp) {
          nx += Math.sin(ny / 90) * 18;
          ny += Math.cos(nx / 90) * 18;
        }
        let n = sampleNoise(l, nx, ny, z + l.z);
        n = (n - 0.5) * l.contrast + 0.5 + l.threshold;
        n = n < 0 ? 0 : n > 1 ? 1 : n;
        n *= applyMask(l.mask, x, y);
        const w = Math.max(0, l.weight);
        
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
  return {
    id: uid++,
    type: 'perlin',
    mask: 'none',
    scale: 60,
    octaves: 4,
    falloff: 0.5,
    seed: 0,
    weight: 1,
    contrast: 1,
    threshold: 0,
    z: 0,
    offsetX: 0,
    offsetY: 0,
    blend: 'avg',
    visible: true
  };
}

function buildCard(l, idx) {
  const allTypes = [...NOISE_TYPES, ...Object.keys(customFns)];
  const card = document.createElement('div');
  card.className = 'layer-card';
  card.dataset.lid = l.id;

  const hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.innerHTML = `<span class="drag-handle">⠿</span><span class="card-num">${idx + 1}</span><span class="card-title">Layer ${idx + 1}</span><span class="card-badge" id="badge_${l.id}">${l.type}</span><span class="card-eye${l.visible ? '' : ' hidden-layer'}" id="eye_${l.id}">${l.visible ? '●' : '○'}</span><span class="card-rm">✕</span>`;
  
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
    render();
  });
  
  const mSel = document.createElement('select');
  MASK_TYPES.forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    o.textContent = m;
    if (m === l.mask) o.selected = true;
    mSel.appendChild(o);
  });
  mSel.addEventListener('change', () => {
    l.mask = mSel.value;
    render();
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
  row2.appendChild(mSel);
  row2.appendChild(bSel);
  body.appendChild(row2);

  const sliders = [
    ['Scale', 4, 400, 1, l.scale, v => l.scale = v],
    ['Octaves', 1, 8, 1, l.octaves, v => l.octaves = v],
    ['Falloff', 0.1, 0.9, 0.05, l.falloff, v => l.falloff = v],
    ['Seed', 0, 9999, 1, l.seed, v => l.seed = v],
    ['Weight', 0, 2, 0.05, l.weight, v => l.weight = v],
    ['Contrast', 0.2, 4, 0.05, l.contrast, v => l.contrast = v],
    ['Threshold', -0.5, 0.5, 0.01, l.threshold, v => l.threshold = v],
    ['Z', -5, 5, 0.01, l.z, v => l.z = v],
  ];
  
  sliders.forEach(([lbl, mn, mx, st, val, cb]) => {
    const d = document.createElement('div');
    d.className = 'ctrl';
    const prec = st < 0.01 ? 3 : st < 0.1 ? 2 : st < 1 ? 2 : 0;
    d.innerHTML = `<label>${lbl}</label><input type="range" min="${mn}" max="${mx}" step="${st}" value="${val}"><input type="number" class="param-number" min="${mn}" max="${mx}" step="${st}" value="${parseFloat(val).toFixed(prec)}" style="width:50px;padding:4px;margin-left:4px">`;
    
    const inp = d.querySelector('input[type=range]');
    const numInp = d.querySelector('input[type=number]');
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      numInp.value = v.toFixed(prec);
      cb(v);
      render();
    });
    numInp.addEventListener('input', () => {
      const v = parseFloat(numInp.value) || 0;
      inp.value = v;
      cb(v);
      render();
    });
    body.appendChild(d);
  });
  
  // Offset controls with draggable number inputs
  ['X', 'Y'].forEach(axis => {
    const offsetVal = axis === 'X' ? l.offsetX : l.offsetY;
    const d = document.createElement('div');
    d.className = 'ctrl';
    d.innerHTML = `<label>Offset ${axis}</label><input type="number" value="${offsetVal.toFixed(0)}" style="flex:1;padding:5px"><span class="val" style="min-width:0"></span>`;
    
    const inp = d.querySelector('input');
    let dragStart = 0;
    let isDragging = false;
    const setter = axis === 'X' ? (v => l.offsetX = v) : (v => l.offsetY = v);
    
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value) || 0;
      setter(v);
      render();
    });
    
    inp.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStart = e.clientY;
      inp.style.cursor = 'ns-resize';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging && d.contains(inp) && document.activeElement === inp) {
        const delta = dragStart - e.clientY;
        const newVal = (parseFloat(inp.value) || 0) + delta * 0.5;
        inp.value = newVal.toFixed(0);
        setter(newVal);
        dragStart = e.clientY;
        render();
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      inp.style.cursor = 'default';
    });
    
    body.appendChild(d);
  });

  card.appendChild(hdr);
  card.appendChild(body);

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
  layers.push(l || mkLayer());
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
    
    const l = mkLayer();
    l.type = name;
    addLayer(l);
    
    msg.textContent = name + ' injected! Available params: x, y, z, sc, octaves, falloff, seed, weight, contrast, threshold';
    msg.className = 'msg ok';
  } catch (e) {
    msg.textContent = 'Error: ' + e.message + ' (check function signature)';
    msg.className = 'msg err';
  }
}

// ============================================================================
// EXPORT FUNCTIONS WITH BUNDLED NOISE-LIB
// ============================================================================

/**
 * Export as JavaScript with bundled NoiseLib
 */
function exportAsJS() {
  const projectName = prompt('Enter project name for exported noise function:', 'NoiseGenerator');
  if (!projectName) return;
  
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Build custom function definitions
  let customFunctionsCode = '';
  let customFunctionsRegistry = '';
  for (const name in customFns) {
    customFunctionsCode += '\n  /**\n   * Custom injected function: ' + name + '\n   */\n  ' + customFns[name].toString() + '\n';
    customFunctionsRegistry += "    '" + name + "': " + name + ',\n';
  }
  
  // Get noise-lib source code
  const noiseLiBSource = `/**
 * Noise Library - Comprehensive noise generation functions
 * Organized by region with self-contained sub-functions
 * All functions follow signature: (x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) => [0, 1]
 */

const NoiseLib = (function() {
  'use strict';

  // ============================================================================
  // REGION: Permutation & Hash Functions (Shared Utilities)
  // ============================================================================
  
  const permCache = {};
  
  /**
   * Generate seeded permutation table for Perlin noise
   */
  function seededPerm(seed) {
    const key = 'p_' + seed;
    if (permCache[key]) return permCache[key];
    
    let s = seed ^ 0x12345678;
    function rand() {
      s = ((s * 1664525 + 1013904223) >>> 0);
      return s / 4294967296;
    }
    
    const base = new Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = base[i];
      base[i] = base[j];
      base[j] = t;
    }
    
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    permCache[key] = p;
    return p;
  }

  /**
   * Hash function for integer coordinates (used in Voronoi/Worley)
   */
  function hash(x, y, seed) {
    let h = seed;
    h ^= (x * 73856093) ^ (y * 19349663);
    h = (h ^ (h >>> 16)) * 0x85ebca6b;
    h = h ^ (h >>> 13);
    return h;
  }

  /**
   * Pseudo-random number from hash
   */
  function hashFloat(h) {
    return (h & 0x7fffffff) / 2147483647;
  }

  // ============================================================================
  // REGION: Perlin Noise & Variations
  // ============================================================================

  /**
   * Fade function for smooth interpolation
   */
  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Linear interpolation
   */
  function lerp(a, b, t) {
    return a + t * (b - a);
  }

  /**
   * Perlin gradient function
   */
  function grad(h, x, y, z) {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  /**
   * 3D Perlin noise function
   */
  function pnoise(P, x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = P[X] + Y;
    const B = P[X + 1] + Y;
    const AA = P[A] + Z;
    const AB = P[A + 1] + Z;
    const BA = P[B] + Z;
    const BB = P[B + 1] + Z;
    
    return lerp(
      lerp(
        lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u),
        lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    ) * 0.5 + 0.5;
  }

  /**
   * Fractional Brownian Motion (fBm) - base for Perlin
   */
  function fbm(P, x, y, z, octaves, falloff) {
    let n = 0;
    let a = 1;
    let f = 1;
    let mx = 0;
    for (let i = 0; i < octaves; i++) {
      n += pnoise(P, x * f, y * f, z) * a;
      mx += a;
      a *= falloff;
      f *= 2;
    }
    return n / mx;
  }

  /**
   * Standard Perlin Noise
   */
  function perlin(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    return fbm(P, nx, ny, z, octaves, falloff);
  }

  /**
   * Ridged Perlin - Creates ridge-like patterns
   */
  function ridged(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    
    let n = 0, a = 1, f = 1, mx = 0;
    for (let i = 0; i < octaves; i++) {
      const p = pnoise(P, nx * f, ny * f, z);
      n += (1 - Math.abs(p * 2 - 1)) * a;
      mx += a;
      a *= falloff;
      f *= 2;
    }
    return n / mx;
  }

  /**
   * Billowy Perlin - Creates cloud-like patterns
   */
  function billowy(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    
    let n = 0, a = 1, f = 1, mx = 0;
    for (let i = 0; i < octaves; i++) {
      const p = pnoise(P, nx * f, ny * f, z);
      n += Math.abs(p * 2 - 1) * a;
      mx += a;
      a *= falloff;
      f *= 2;
    }
    return n / mx;
  }

  // ============================================================================
  // REGION: Fixed Voronoi & Cellular Noise
  // ============================================================================

  /**
   * Internal Helper: Hash function to get a "random" 2D point for a cell
   * Returns [x, y] offsets between 0 and 1
   */
  function _getHashPoint(cx, cy, seed) {
    const h1 = Math.sin(cx * 127.1 + cy * 311.7 + seed * 41.3) * 43758.5453;
    const h2 = Math.sin(cx * 269.5 + cy * 183.3 + seed * 41.3) * 43758.5453;
    return [h1 - Math.floor(h1), h2 - Math.floor(h2)];
  }

  /**
   * Core Cellular Calculation
   * Returns { d1: closest, d2: second_closest }
   */
  function _calculateCellular(x, y, scale, seed) {
    const cx = Math.floor(x / scale);
    const cy = Math.floor(y / scale);
    const lx = x / scale - cx;
    const ly = y / scale - cy;

    let d1 = 2.0;
    let d2 = 2.0;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const point = _getHashPoint(cx + i, cy + j, seed);
        const dx = i + point[0] - lx;
        const dy = j + point[1] - ly;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < d1) {
          d2 = d1;
          d1 = dist;
        } else if (dist < d2) {
          d2 = dist;
        }
      }
    }
    return { d1, d2 };
  }

  /**
   * Voronoi - Standard cell centers
   */
  function voronoi(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const res = _calculateCellular(x, y, scale, seed);
    return Math.min(1, res.d1);
  }

  /**
   * Worley / Cellular - Multi-octave distance noise
   */
  function worley(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    let n = 0;
    let amp = 1;
    let maxAmp = 0;
    let currentScale = scale;

    for (let i = 0; i < octaves; i++) {
      n += voronoi(x, y, z, currentScale, 1, 0, seed + i) * amp;
      maxAmp += amp;
      amp *= falloff;
      currentScale *= 0.5;
    }
    return n / maxAmp;
  }

  /**
   * Voronoi Cracks (F2 - F1)
   * This creates the "stained glass" or "cracked earth" edge lines
   */
  function voronoiCracks(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const res = _calculateCellular(x, y, scale, seed);
    const diff = res.d2 - res.d1;
    return Math.min(1, diff * 2.0);
  }

  /**
   * Voronoi Edge - Inverted distance
   */
  function voronoiEdge(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    return 1 - voronoi(x, y, z, scale, octaves, falloff, seed);
  }

  /**
   * Worley Edge - Inverted Worley
   */
  function worleyEdge(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    return 1 - worley(x, y, z, scale, octaves, falloff, seed);
  }

  // ============================================================================
  // REGION: Simple Patterns
  // ============================================================================

  /**
   * Sine Wave - X-axis (seed-based)
   */
  function sineX(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    return (Math.sin(x / scale * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
  }

  /**
   * Sine Wave - Y-axis (seed-based)
   */
  function sineY(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    return (Math.sin(y / scale * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
  }

  /**
   * Sine Wave - Radial (seed-based)
   */
  function sineRadial(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const r = Math.sqrt(x * x + y * y) / scale;
    return (Math.sin(r * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
  }

  /**
   * Checkerboard pattern (seed-based)
   */
  function checkerboard(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const offset = ((seed % 2) === 0) ? 0 : 1;
    return ((Math.floor(x / scale) + Math.floor(y / scale) + offset) % 2 === 0) ? 1 : 0;
  }

  /**
   * Domain Warped Perlin (seed-based)
   */
  function domainWarp(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold) {
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    const P2 = seededPerm(seed + 12345);
    const P3 = seededPerm(seed + 54321);
    const wx = pnoise(P2, nx, ny, z) * scale * 0.8;
    const wy = pnoise(P3, nx + 5.2, ny + 1.3, z) * scale * 0.8;
    return fbm(P, (x + wx) / scale, (y + wy) / scale, z + 0.5, octaves, falloff);
  }
${customFunctionsCode}
  // ============================================================================
  // REGION: Utility Functions
  // ============================================================================

  /**
   * Clamp value to [0, 1]
   */
  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  /**
   * Create noise function from type name
   */
  function getNoiseFunction(type) {
    return NOISE_FUNCTIONS[type] || perlin;
  }

  // ============================================================================
  // NOISE FUNCTIONS REGISTRY - Single source of truth
  // ============================================================================
  
  const NOISE_FUNCTIONS = {
    'perlin': perlin,
    'ridged': ridged,
    'billowy': billowy,
    'voronoi': voronoi,
    'voronoi_edge': voronoiEdge,
    'voronoi_cracks': voronoiCracks,
    'worley': worley,
    'worley_edge': worleyEdge,
    'sine_x': sineX,
    'sine_y': sineY,
    'sine_radial': sineRadial,
    'checkerboard': checkerboard,
    'domain_warp': domainWarp${customFunctionsRegistry ? ',\n' + customFunctionsRegistry.trim() : ''}
  };
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    perlin,
    ridged,
    billowy,
    voronoi,
    voronoiEdge,
    voronoiCracks,
    worley,
    worleyEdge,
    sineX,
    sineY,
    sineRadial,
    checkerboard,
    domainWarp,
    getNoiseFunction,
    clamp01,
    seededPerm,
    pnoise,
    fbm,
    types: Object.keys(NOISE_FUNCTIONS)
  };
})();`;

  const exportCode = `/*! ${projectName} - Optimized Noise Generator */
/* Built with bundled NoiseLib */

${noiseLiBSource}

// ============================================================================
// CONFIGURATION & RENDERING ENGINE
// ============================================================================

const ${sanitizedName} = (function() {
  const globalState = ${JSON.stringify(gState)};
  const layers = ${JSON.stringify(layers)};
  
  function sampleNoise(layer, x, y, z) {
    const noiseFn = NoiseLib.getNoiseFunction(layer.type);
    return noiseFn(x, y, z, layer.scale, layer.octaves, layer.falloff, layer.seed, layer.weight, layer.contrast, layer.threshold);
  }
  
  function applyMask(mask, x, y, w, h) {
    switch (mask) {
      case 'circle': {
        const dx = x / w - 0.5;
        const dy = y / h - 0.5;
        return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.5);
      }
      case 'square': {
        const dx = Math.abs(x / w - 0.5);
        const dy = Math.abs(y / h - 0.5);
        return Math.max(0, 1 - Math.max(dx, dy) * 2.5);
      }
      case 'diamond': {
        const dx = Math.abs(x / w - 0.5);
        const dy = Math.abs(y / h - 0.5);
        return Math.max(0, 1 - (dx + dy) * 2.2);
      }
      default:
        return 1;
    }
  }
  
  function getValue(x, y, z = 0) {
    const visLayers = layers.filter(layer => layer.visible);
    if (!visLayers.length) return 0.5;
    
    let final = 0;
    for (let li = 0; li < visLayers.length; li++) {
      const layer = visLayers[li];
      let nx = (x + globalState.offsetX) * globalState.zoom + layer.offsetX;
      let ny = (y + globalState.offsetY) * globalState.zoom + layer.offsetY;
      
      let n = sampleNoise(layer, nx, ny, z + layer.z);
      n = (n - 0.5) * layer.contrast + 0.5 + layer.threshold;
      n = n < 0 ? 0 : n > 1 ? 1 : n;
      n *= applyMask(layer.mask, x, y, 480, 360);
      const w = Math.max(0, layer.weight);
      
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
    NoiseLib,
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

function exportAsJSON() {
  const projectName = prompt('Enter project name for this configuration:', 'NoiseConfig');
  if (!projectName) return;
  
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    projectName: projectName,
    description: 'Noise mixer configuration exported from Noise Mixer',
    globalState: gState,
    layers: layers,
    customFunctions: Object.keys(customFns).map(name => ({
      name,
      code: customFns[name].toString()
    }))
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = projectName.replace(/[^a-zA-Z0-9_]/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  
  document.getElementById('export-msg').textContent = 'Downloaded: ' + projectName + '.json';
  document.getElementById('export-msg').className = 'msg ok';
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
document.getElementById('export-btn').addEventListener('click', exportAsJS);
document.getElementById('export-json-btn').addEventListener('click', exportAsJSON);

// Import JSON handler
const importJsonBtn = document.getElementById('import-json-btn');
const importJsonFile = document.getElementById('import-json-file');

if (importJsonBtn && importJsonFile) {
  importJsonBtn.addEventListener('click', () => {
    importJsonFile.click();
  });
  
  importJsonFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.globalState || !data.layers) {
          throw new Error('Invalid configuration format');
        }
        
        // Restore global state
        Object.assign(gState, data.globalState);
        
        // Restore custom functions if any
        if (data.customFunctions && Array.isArray(data.customFunctions)) {
          data.customFunctions.forEach(cf => {
            try {
              customFns[cf.name] = new Function('return (' + cf.code + ')')();
            } catch (e) {
              console.warn('Failed to restore custom function ' + cf.name + ':', e);
            }
          });
        }
        
        // Restore layers
        layers = data.layers.map(l => ({...l, id: uid++}));
        
        // Update UI
        document.getElementById('g-color').value = gState.color;
        document.getElementById('g-res').value = gState.res;
        document.getElementById('g-zoom').value = gState.zoom;
        document.getElementById('zoom-val').textContent = gState.zoom.toFixed(1) + 'x';
        document.getElementById('g-panx').value = gState.offsetX;
        document.getElementById('g-pany').value = gState.offsetY;
        
        // Update toggles
        document.getElementById('t-invert').classList.toggle('on', gState.invert);
        
        renderLayers();
        document.getElementById('export-msg').textContent = 'Configuration loaded: ' + (data.projectName || 'Untitled');
        document.getElementById('export-msg').className = 'msg ok';
        importJsonFile.value = '';
      } catch (e) {
        document.getElementById('export-msg').textContent = 'Error loading JSON: ' + e.message;
        document.getElementById('export-msg').className = 'msg err';
        importJsonFile.value = '';
      }
    };
    reader.readAsText(file);
  });
}

// Event Listeners - Feature Toggles
['t-invert', 't-contour', 't-warp'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', () => {
      const on = el.classList.toggle('on');
      const prop = id.replace('t-', '');
      gState[prop] = on;
      render();
    });
  }
});

// Light Mode Toggle with error handling
document.addEventListener('DOMContentLoaded', () => {
  const lightModeBtn = document.getElementById('t-lightmode');
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

// Initialize
addLayer();
