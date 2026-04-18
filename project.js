// Project Management Module - Save and Load Projects with all data

function saveProject() {
  const projectName = window.currentProjectName || 'Untitled Project';
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    projectName: projectName,
    description: 'Noise mixer configuration exported from Noise Mixer',
    globalState: gState,
    layers: layers,
    colorSchemes: colorSchemes,
    customFunctions: Object.keys(customFns).map(cf => ({
      name: cf,
      code: customFns[cf].toString()
    })),
    customParamDefaults: customFnParamDefaults,
    customParamMeta: customFnParamMeta
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = projectName.replace(/[^a-zA-Z0-9_]/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadProject(jsonString) {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.globalState || !data.layers) {
        reject(new Error('Invalid project format'));
        return;
      }

      // Restore project name
      if (data.projectName) {
        window.currentProjectName = data.projectName;
        const display = document.getElementById('project-name-display');
        if (display) display.textContent = window.currentProjectName;
      }

      // Restore global state
      Object.assign(gState, data.globalState);

      // Restore color schemes
      if (data.colorSchemes && typeof data.colorSchemes === 'object') {
        Object.assign(colorSchemes, data.colorSchemes);
      }

      // Restore custom functions
      if (data.customFunctions && Array.isArray(data.customFunctions)) {
        data.customFunctions.forEach(cf => {
          try {
            customFns[cf.name] = new Function('return (' + cf.code + ')')();
          } catch (e) {
            console.warn('Failed to restore custom function ' + cf.name + ':', e);
          }
        });
      }

      // Restore custom param defaults/meta
      if (data.customParamDefaults && typeof data.customParamDefaults === 'object') {
        Object.assign(customFnParamDefaults, data.customParamDefaults);
      }
      if (data.customParamMeta && typeof data.customParamMeta === 'object') {
        Object.assign(customFnParamMeta, data.customParamMeta);
      }

      // Restore layers
      layers = data.layers.map(l => normalizeLayer({ ...l, id: uid++ }));

      // Update UI controls
      const colorSelect = document.getElementById('g-color');
      if (colorSelect) colorSelect.value = gState.color;
      
      const resSelect = document.getElementById('g-res');
      if (resSelect) resSelect.value = gState.res;
      
      const zoomSlider = document.getElementById('g-zoom');
      if (zoomSlider) {
        zoomSlider.value = gState.zoom;
        const zoomVal = document.getElementById('zoom-val');
        if (zoomVal) zoomVal.textContent = gState.zoom.toFixed(1) + 'x';
      }
      
      const panXInput = document.getElementById('g-panx');
      if (panXInput) panXInput.value = gState.offsetX;
      
      const panYInput = document.getElementById('g-pany');
      if (panYInput) panYInput.value = gState.offsetY;
      
      const zSlider = document.getElementById('g-z');
      if (zSlider) {
        zSlider.value = gState.z || 0;
        const zVal = document.getElementById('z-val');
        if (zVal) zVal.textContent = (gState.z || 0).toFixed(1);
      }
      
      const invertToggle = document.getElementById('t-invert');
      if (invertToggle) invertToggle.classList.toggle('on', false);

      // Update color scheme dropdowns with new schemes
      updateColorSelectDropdown();
      updateColorSchemesModalDropdown();

      renderLayers();
      render();

    //   resolve('Project loaded successfully');
    } catch (e) {
      reject(new Error('Error loading project: ' + e.message));
    }
  });
}
