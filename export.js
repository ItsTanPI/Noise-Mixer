// Export module - optimized bundled JS builder
(() => {
  function exportAsJS() {
    const projectName = window.currentProjectName
      || document.getElementById('project-name-display')?.textContent
      || document.getElementById('project-name-input')?.value
      || 'NoiseGenerator';
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_]/g, '_');

    const visLayers = (window.layers || []).filter(l => l.visible);
    const usedCustom = new Set();
    const builtInBlends = window.NM?.BLEND_MODES || ['avg', 'add', 'mul', 'max', 'min', 'diff'];
    const usedCustomBlends = new Set();
    visLayers.forEach(l => {
      if (window.customFns && window.customFns[l.type]) usedCustom.add(l.type);
      if (window.NM?.customBlends?.[l.blend]) usedCustomBlends.add(l.blend);
    });

    let customFunctionsCode = '';
    let customFunctionsRegistry = '';
    usedCustom.forEach(name => {
      customFunctionsCode += '\n  /**\n   * Custom injected function: ' + name + '\n   */\n  ' + window.customFns[name].toString() + '\n';
      customFunctionsRegistry += "    '" + name + "': " + name + ',\n';
    });

    let customBlendsCode = '';
    let customBlendsRegistry = '';
    usedCustomBlends.forEach(name => {
      customBlendsCode += '\n  /**\n   * Custom blend function: ' + name + '\n   */\n  ' + window.NM.customBlends[name].toString() + '\n';
      customBlendsRegistry += "    '" + name + "': " + name + ',\n';
    });

    let noiseLibSource = '';
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'noise-lib.js', false);
    try {
      xhr.send();
      if (xhr.status === 200) noiseLibSource = xhr.responseText;
      else noiseLibSource = '// ERROR: Could not load noise-lib.js';
    } catch (e) {
      noiseLibSource = '// ERROR: ' + e.message;
    }

    const layerInit = visLayers.map((l, idx) => {
      const params = JSON.stringify(l.params || {});
      const seed = typeof l.seed === 'number' ? l.seed : 0;
      const offsetX = typeof l.offsetX === 'number' ? l.offsetX : 0;
      const offsetY = typeof l.offsetY === 'number' ? l.offsetY : 0;
      const z = typeof l.z === 'number' ? l.z : 0;
      const blend = l.blend || 'avg';
      const type = l.type || 'perlin';
      return {
        idx,
        params,
        seed,
        offsetX,
        offsetY,
        z,
        blend,
        type
      };
    });

    let layerCode = '';
    layerInit.forEach((l, idx) => {
      layerCode += `\n    const params${idx} = ${l.params};`;
      layerCode += `\n    const noiseFn${idx} = customFunctions['${l.type}'] || NoiseLib.getNoiseFunction('${l.type}');`;
      layerCode += `\n    const nx${idx} = (x + globalState.offsetX) * globalState.zoom + ${l.offsetX};`;
      layerCode += `\n    const ny${idx} = (y + globalState.offsetY) * globalState.zoom + ${l.offsetY};`;
      layerCode += `\n    let n${idx} = noiseFn${idx}(nx${idx}, ny${idx}, z + ${l.z}, ${l.seed}, params${idx});`;
      layerCode += `\n    n${idx} = n${idx} < 0 ? 0 : n${idx} > 1 ? 1 : n${idx};`;
      if (idx === 0) {
        layerCode += `\n    final = n${idx};`;
      } else {
        layerCode += `\n    final = applyBlend(final, n${idx}, '${l.blend}', { layerIndex: ${idx} });`;
      }
    });

    const exportCode = `/*! ${projectName} - Optimized Noise Generator */
/* Built with bundled NoiseLib - Automatically loaded from noise-lib.js */

${noiseLibSource}

// ============================================================================
// CUSTOM INJECTED FUNCTIONS
// ============================================================================
${customFunctionsCode}

// ============================================================================
// CUSTOM BLEND FUNCTIONS
// ============================================================================
${customBlendsCode}

// ============================================================================
// CONFIGURATION & RENDERING ENGINE (OPTIMIZED)
// ============================================================================

const ${sanitizedName} = (function() {
  const globalState = ${JSON.stringify(window.gState)};
  const layers = ${JSON.stringify(window.layers)};
  const customParamDefaults = ${JSON.stringify(window.customFnParamDefaults)};
  const customParamMeta = ${JSON.stringify(window.customFnParamMeta)};

  const customFunctions = {
${customFunctionsRegistry}
  };

  const blendFns = {
    avg: (a, b) => (a + b) / 2,
    add: (a, b) => Math.min(1, a + b),
    mul: (a, b) => a * b,
    max: (a, b) => Math.max(a, b),
    min: (a, b) => Math.min(a, b),
    diff: (a, b) => Math.abs(a - b),
${customBlendsRegistry}
  };

  function clamp01(v) {
    if (!Number.isFinite(v)) return 0;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function applyBlend(base, layerValue, blend, ctx) {
    const fn = blendFns[blend];
    if (!fn) return base;
    const v = fn(base, layerValue, ctx);
    return clamp01(+v);
  }

  function getValue(x, y, z = 0) {
    let final = 0;
${layerCode}
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

if (typeof window !== 'undefined') {
  window['${sanitizedName}'] = ${sanitizedName};
}
`;

    const blob = new Blob([exportCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizedName + '.js';
    a.click();
    URL.revokeObjectURL(url);

    const msgEl = document.getElementById('export-msg');
    if (msgEl) {
      msgEl.textContent = 'Downloaded: ' + sanitizedName + '.js (optimized)';
      msgEl.className = 'msg ok';
    }
  }

  window.exportAsJS = exportAsJS;
})();
