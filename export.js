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
    visLayers.forEach(l => {
      if (window.customFns && window.customFns[l.type]) usedCustom.add(l.type);
    });

    let customFunctionsCode = '';
    let customFunctionsRegistry = '';
    usedCustom.forEach(name => {
      customFunctionsCode += '\n  /**\n   * Custom injected function: ' + name + '\n   */\n  ' + window.customFns[name].toString() + '\n';
      customFunctionsRegistry += "    '" + name + "': " + name + ',\n';
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
        if (l.blend === 'avg') layerCode += `\n    final = (final + n${idx}) / 2;`;
        else if (l.blend === 'add') layerCode += `\n    final = Math.min(1, final + n${idx});`;
        else if (l.blend === 'mul') layerCode += `\n    final *= n${idx};`;
        else if (l.blend === 'max') layerCode += `\n    final = Math.max(final, n${idx});`;
        else if (l.blend === 'min') layerCode += `\n    final = Math.min(final, n${idx});`;
        else if (l.blend === 'diff') layerCode += `\n    final = Math.abs(final - n${idx});`;
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
