/**
 * Noise Library - Comprehensive noise generation functions
 * Organized by region with self-contained sub-functions
 * All functions follow signature: (x, y, z, scale, octaves, falloff, seed) => [0, 1]
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
  function perlin(x, y, z, scale, octaves, falloff, seed) {
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    return fbm(P, nx, ny, z, octaves, falloff);
  }

  /**
   * Ridged Perlin - Creates ridge-like patterns
   */
  function ridged(x, y, z, scale, octaves, falloff, seed) {
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
  function billowy(x, y, z, scale, octaves, falloff, seed) {
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
  const lx = x / scale - cx; // Local x (0 to 1)
  const ly = y / scale - cy; // Local y (0 to 1)

  let d1 = 2.0; // F1
  let d2 = 2.0; // F2

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const point = _getHashPoint(cx + i, cy + j, seed);
      
      // Calculate distance from local position to the neighbor's point
      // We add the neighbor offset (i, j) to the random point position
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
function voronoi(x, y, z, scale, octaves, falloff, seed) {
  const res = _calculateCellular(x, y, scale, seed);
  return Math.min(1, res.d1);
}

/**
 * Worley / Cellular - Multi-octave distance noise
 */
function worley(x, y, z, scale, octaves, falloff, seed) {
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
function voronoiCracks(x, y, z, scale, octaves, falloff, seed) {
  const res = _calculateCellular(x, y, scale, seed);
  // The closer F2 and F1 are, the closer we are to a boundary
  const diff = res.d2 - res.d1;
  return Math.min(1, diff * 2.0); // Multiply by 2 to sharpen the cracks
}

/**
 * Voronoi Edge - Inverted distance
 */
function voronoiEdge(x, y, z, scale, octaves, falloff, seed) {
  return 1 - voronoi(x, y, z, scale, octaves, falloff, seed);
}

/**
 * Worley Edge - Inverted Worley
 */
function worleyEdge(x, y, z, scale, octaves, falloff, seed) {
  return 1 - worley(x, y, z, scale, octaves, falloff, seed);
}

  // ============================================================================
  // REGION: Simple Patterns
  // ============================================================================

  /**
   * Sine Wave - X-axis (seed-based)
   */
  function sineX(x, y, z, scale, octaves, falloff, seed) {
    return (Math.sin(x / scale * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
  }

  /**
   * Sine Wave - Y-axis (seed-based)
   */
  function sineY(x, y, z, scale, octaves, falloff, seed) {
    return (Math.sin(y / scale * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
  }

  /**
   * Sine Wave - Radial (seed-based)
   */
  function sineRadial(x, y, z, scale, octaves, falloff, seed) {
    const r = Math.sqrt(x * x + y * y) / scale;
    return (Math.sin(r * 6.28 + z * 5 + seed * 0.01) + 1) / 2;
  }

  /**
   * Checkerboard pattern (seed-based)
   */
  function checkerboard(x, y, z, scale, octaves, falloff, seed) {
    // Use seed to create offset in checkerboard pattern
    const offset = ((seed % 2) === 0) ? 0 : 1;
    return ((Math.floor(x / scale) + Math.floor(y / scale) + offset) % 2 === 0) ? 1 : 0;
  }

  /**
   * Domain Warped Perlin (seed-based)
   */
  function domainWarp(x, y, z, scale, octaves, falloff, seed) {
    const P = seededPerm(seed);
    const nx = x / scale;
    const ny = y / scale;
    // Use different seed offsets for independent warp components
    const P2 = seededPerm(seed + 12345);
    const P3 = seededPerm(seed + 54321);
    const wx = pnoise(P2, nx, ny, z) * scale * 0.8;
    const wy = pnoise(P3, nx + 5.2, ny + 1.3, z) * scale * 0.8;
    return fbm(P, (x + wx) / scale, (y + wy) / scale, z + 0.5, octaves, falloff);
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
