// Shared state and helpers
(() => {
  const NM = (window.NM = window.NM || {});

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
    }
  };

  // Constants - Noise types loaded from NoiseLib
  const NOISE_TYPES = NoiseLib.types;

  // Global State
  const gState = {
    res: 2,
    color: 'gray',
    offsetX: 0,
    offsetY: 0,
    zoom: 1
  };

  // Mutable shared values
  let uid = 0;
  let zValue = 0;
  let layers = [];
  let dragSrcId = null;

  const customFns = {};
  const customFnParamDefaults = {};
  const customFnParamMeta = {};
  const builtInParamDefaults = {};
  const builtInParamMeta = {};

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

  NM.colorSchemes = colorSchemes;
  NM.NOISE_TYPES = NOISE_TYPES;
  NM.gState = gState;
  NM.customFns = customFns;
  NM.customFnParamDefaults = customFnParamDefaults;
  NM.customFnParamMeta = customFnParamMeta;
  NM.builtInParamDefaults = builtInParamDefaults;
  NM.builtInParamMeta = builtInParamMeta;
  NM.ensureLayerParams = ensureLayerParams;
  NM.extractDefaultParamsFromSource = extractDefaultParamsFromSource;
  NM.cacheBuiltInDefaults = cacheBuiltInDefaults;
  NM.applyDefaultsForType = applyDefaultsForType;
  NM.normalizeLayer = normalizeLayer;

  Object.defineProperty(window, 'layers', {
    get: () => layers,
    set: (v) => {
      layers = v;
      NM.layers = v;
    }
  });
  Object.defineProperty(window, 'uid', {
    get: () => uid,
    set: (v) => {
      uid = v;
      NM.uid = v;
    }
  });
  Object.defineProperty(window, 'zValue', {
    get: () => zValue,
    set: (v) => {
      zValue = v;
      NM.zValue = v;
    }
  });
  Object.defineProperty(window, 'dragSrcId', {
    get: () => dragSrcId,
    set: (v) => {
      dragSrcId = v;
      NM.dragSrcId = v;
    }
  });

  // Backward-compatible globals
  window.colorSchemes = colorSchemes;
  window.NOISE_TYPES = NOISE_TYPES;
  window.gState = gState;
  window.customFns = customFns;
  window.customFnParamDefaults = customFnParamDefaults;
  window.customFnParamMeta = customFnParamMeta;
  window.builtInParamDefaults = builtInParamDefaults;
  window.builtInParamMeta = builtInParamMeta;
  window.ensureLayerParams = ensureLayerParams;
  window.extractDefaultParamsFromSource = extractDefaultParamsFromSource;
  window.cacheBuiltInDefaults = cacheBuiltInDefaults;
  window.applyDefaultsForType = applyDefaultsForType;
  window.normalizeLayer = normalizeLayer;
  window.layers = layers;
  window.uid = uid;
  window.zValue = zValue;
  window.dragSrcId = dragSrcId;
})();
