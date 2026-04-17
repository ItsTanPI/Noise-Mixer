/**
 * Noise Library - Comprehensive noise generation functions
 * Organized by region with self-contained sub-functions
 * All functions follow signature: (x, y, z, seed, params) => [0, 1]
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
  function perlin(x, y, z, seed, params = { scale: 60, octaves: 4, falloff: 0.5, contrast: 1, threshold: 0 }) {
    const { scale = 60, octaves = 4, falloff = 0.5 } = params;
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    const n = fbm(P, nx, ny, z, octaves, falloff);
    return applyPost(n, params);
  }

  /**
   * Ridged Perlin - Creates ridge-like patterns
   */
  function ridged(x, y, z, seed, params = { scale: 60, octaves: 4, falloff: 0.5, contrast: 1, threshold: 0 }) {
    const { scale = 60, octaves = 4, falloff = 0.5 } = params;
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
    return applyPost(n / mx, params);
  }

  /**
   * Billowy Perlin - Creates cloud-like patterns
   */
  function billowy(x, y, z, seed, params = { scale: 60, octaves: 4, falloff: 0.5, contrast: 1, threshold: 0 }) {
    const { scale = 60, octaves = 4, falloff = 0.5 } = params;
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
    return applyPost(n / mx, params);
  }

  // ============================================================================
// REGION: Fixed Voronoi & Cellular Noise
// ============================================================================

/**
 * Internal Helper: Hash function to get a "random" 3D point for a cell
 * Returns [x, y, z] offsets between 0 and 1
 */
function _getHashPoint3D(cx, cy, cz, seed, angle = 0) {
  const h1 = Math.sin(cx * 127.1 + cy * 311.7 + cz * 74.9 + seed * 41.3) * 43758.5453;
  const h2 = Math.sin(cx * 269.5 + cy * 183.3 + cz * 246.1 + seed * 41.3) * 43758.5453;
  const h3 = Math.sin(cx * 419.2 + cy * 371.9 + cz * 156.7 + seed * 41.3) * 43758.5453;

  let px = h1 - Math.floor(h1);
  let py = h2 - Math.floor(h2);
  let pz = h3 - Math.floor(h3);

  const angleRad = (angle * Math.PI) / 180;
  const t = Math.min(1, Math.abs(angle) / 180);
  px = 0.5 + (px - 0.5) * t;
  py = 0.5 + (py - 0.5) * t;
  pz = 0.5 + (pz - 0.5) * t;

  if (angleRad !== 0) {
    const r = _rotate3D(px - 0.5, py - 0.5, pz - 0.5, angleRad);
    px = r.x + 0.5;
    py = r.y + 0.5;
    pz = r.z + 0.5;
  }

  return [px, py, pz];
}

/**
 * Core Cellular Calculation (3D)
 * Returns { d1: closest, d2: second_closest }
 */
function _calculateCellular3D(x, y, z, scale, seed, angleMax = 0) {
  const sx = x / scale;
  const sy = y / scale;
  const sz = z / scale;

  const cx = Math.floor(sx);
  const cy = Math.floor(sy);
  const cz = Math.floor(sz);

  const lx = sx - cx;
  const ly = sy - cy;
  const lz = sz - cz;

  let d1 = 999.0;
  let d2 = 999.0;
  let c1x = cx, c1y = cy, c1z = cz;

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        const ncx = cx + i;
        const ncy = cy + j;
        const ncz = cz + k;

        const point = _getHashPoint3D(ncx, ncy, ncz, seed, angleMax);

        const dx = (i + point[0]) - lx;
        const dy = (j + point[1]) - ly;
        const dz = (k + point[2]) - lz;

        // Squared first, sqrt only when needed
        const distSq = dx*dx + dy*dy + dz*dz;

        if (distSq < d1) {
          d2 = d1;           // old closest becomes second
          d1 = distSq;
          c1x = ncx;
          c1y = ncy;
          c1z = ncz;
        } else if (distSq < d2) {
          d2 = distSq;
        }
      }
    }
  }

  return {
    d1: Math.sqrt(d1),
    d2: Math.sqrt(d2),
    cx: c1x,
    cy: c1y,
    cz: c1z
  };
}

/**
 * Rotate 2D point by degrees
 */
function _rotate2D(x, y, angleDeg) {
  if (!angleDeg) return { x, y };
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c - y * s, y: x * s + y * c };
}

/**
 * Rotate 3D point around Z axis (radians)
 */
function _rotate3D(x, y, z, angleRad) {
  if (!angleRad) return { x, y, z };
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: x * c - y * s, y: x * s + y * c, z };
}

/**
 * Voronoi - Standard cell centers
 */
  function voronoiRaw(x, y, z, seed, scale, angle) {
    const res = _calculateCellular3D(x, y, z, scale, seed, angle);
    return Math.min(1, res.d1);
  }

  function voronoi(x, y, z, seed, params = { scale: 60, angle: 0, contrast: 1, threshold: 0 }) {
    const { scale = 60, angle = 0 } = params;
    const n = voronoiRaw(x, y, z, seed, scale, angle);
    return applyPost(n, params);
  }

/**
 * Worley / Cellular - Multi-octave distance noise
 */
  function worleyRaw(x, y, z, seed, scale, angle, octaves, falloff) {
    let n = 0;
    
    let amp = 1;
    let maxAmp = 0;
    let currentScale = scale;

    for (let i = 0; i < octaves; i++) {
      n += voronoiRaw(x, y, z, seed + i, currentScale, angle) * amp;
      maxAmp += amp;
      amp *= falloff;
      currentScale *= 0.5;
    }
    return n / maxAmp;
  }

  function worley(x, y, z, seed, params = { scale: 60, angle: 0, octaves: 4, falloff: 0.5, contrast: 1, threshold: 0 }) {
    const { scale = 60, angle = 0, octaves = 4, falloff = 0.5 } = params;
    const n = worleyRaw(x, y, z, seed, scale, angle, octaves, falloff);
    return applyPost(n, params);
  }

/**
 * Voronoi Cracks (F2 - F1)
 * This creates the "stained glass" or "cracked earth" edge lines
 */
  function voronoiCracks(x, y, z, seed, params = { scale: 60, angle: 0, contrast: 1, threshold: 0 }) {
    const { scale = 60, angle = 0 } = params;
    const res = _calculateCellular3D(x, y, z, scale, seed, angle);
    // The closer F2 and F1 are, the closer we are to a boundary
    const diff = res.d2 - res.d1;
    const n = Math.min(1, diff * 2.0); // Multiply by 2 to sharpen the cracks
    return applyPost(n, params);
  }

/**
 * Voronoi Edge - Inverted distance
 */
  function voronoiEdge(x, y, z, seed, params = { scale: 60, angle: 0, contrast: 1, threshold: 0 }) {
    const { scale = 60, angle = 0 } = params;
    const n = 1 - voronoiRaw(x, y, z, seed, scale, angle);
    return applyPost(n, params);
  }

/**
 * Worley Edge - Inverted Worley
 */
  function worleyEdge(x, y, z, seed, params = { scale: 60, angle: 0, octaves: 4, falloff: 0.5, contrast: 1, threshold: 0 }) {
    const { scale = 60, angle = 0, octaves = 4, falloff = 0.5 } = params;
    const n = 1 - worleyRaw(x, y, z, seed, scale, angle, octaves, falloff);
    return applyPost(n, params);
  }

  // ============================================================================
  // REGION: Simple Patterns
  // ============================================================================

  /**
   * Sine Wave - X-axis (seed-based)
   */
  function sineX(x, y, z, seed, params = { scale: 60, contrast: 1, threshold: 0 }) {
    const { scale = 60 } = params;
    const n = (Math.sin(x / scale * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
    return applyPost(n, params);
  }

  /**
   * Sine Wave - Y-axis (seed-based)
   */
  function sineY(x, y, z, seed, params = { scale: 60, contrast: 1, threshold: 0 }) {
    const { scale = 60 } = params;
    const n = (Math.sin(y / scale * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
    return applyPost(n, params);
  }

  /**
   * Sine Wave - Radial (seed-based)
   */
  function sineRadial(x, y, z, seed, params = { scale: 60, contrast: 1, threshold: 0 }) {
    const { scale = 60 } = params;
    const r = Math.sqrt(x * x + y * y) / scale;
    const n = (Math.sin(r * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
    return applyPost(n, params);
  }

  /**
   * Checkerboard pattern (seed-based)
   */
  function checkerboard(x, y, z, seed, params = { scale: 60, contrast: 1, threshold: 0 }) {
    const { scale = 60 } = params;
    // Use seed to create offset in checkerboard pattern
    const offset = ((seed % 2) === 0) ? 0 : 1;
    const n = ((Math.floor(x / scale) + Math.floor(y / scale) + offset) % 2 === 0) ? 1 : 0;
    return applyPost(n, params);
  }

  /**
   * Domain Warped Perlin (seed-based)
   */
  function domainWarp(x, y, z, seed, params = { scale: 60, octaves: 4, falloff: 0.5, warpStrength: 0.8, contrast: 1, threshold: 0 }) {
    const { scale = 60, octaves = 4, falloff = 0.5, warpStrength = 0.8 } = params;
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    // Use different seed offsets for independent warp components
    const P2 = seededPerm(seed + 12345);
    const P3 = seededPerm(seed + 54321);
    const wx = pnoise(P2, nx, ny, z) * scale * warpStrength;
    const wy = pnoise(P3, nx + 5.2, ny + 1.3, z) * scale * warpStrength;
    const n = fbm(P, (x + wx) / scale, (y + wy) / scale, z + 0.5, octaves, falloff);
    return applyPost(n, params);
  }

  /**
   * Voronoi Cell Value - each cell has its own 0..1 value
   */
  function voronoiCell(x, y, z, seed, params = { scale: 60, angle: 0, contrast: 1, threshold: 0 }) {
    const { scale = 60, angle = 0 } = params;
    const res = _calculateCellular3D(x, y, z, scale, seed, angle);
    const v = hashFloat(hash(res.cx, res.cy, seed + 9001) ^ hash(res.cz, res.cz, seed + 1337));
    return applyPost(v, params);
  }

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
   * Apply post-processing controls (contrast & threshold)
   */
  function applyPost(n, params) {
    const p = params || {};
    const contrast = typeof p.contrast === 'number' ? p.contrast : 1;
    const threshold = typeof p.threshold === 'number' ? p.threshold : 0;
    if (contrast !== 1) n = (n - 0.5) * contrast + 0.5;
    n = clamp01(n);
    if (threshold > 0) n = n >= threshold ? 1 : 0;
    return clamp01(n);
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
    'voronoi_cell': voronoiCell,
    'worley': worley,
    'worley_edge': worleyEdge,
    'sine_x': sineX,
    'sine_y': sineY,
    'sine_radial': sineRadial,
    'checkerboard': checkerboard,
    'domain_warp': domainWarp
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    // Core Perlin functions
    perlin,
    ridged,
    billowy,
    
    // Voronoi & Cellular
    voronoi,
    voronoiEdge,
    voronoiCracks,
    voronoiCell,
    worley,
    worleyEdge,
    
    // Simple patterns
    sineX,
    sineY,
    sineRadial,
    checkerboard,
    domainWarp,
    
    // Utilities
    getNoiseFunction,
    clamp01,
    seededPerm,
    pnoise,
    fbm,
    
    // Available types - Auto-generated from NOISE_FUNCTIONS
    types: Object.keys(NOISE_FUNCTIONS)
  };
})();

// For Node.js compatibility (optional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NoiseLib;
}
