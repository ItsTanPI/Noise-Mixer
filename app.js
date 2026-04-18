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
let exampleIndex = 0;
const examplePrevBtn = document.getElementById('example-prev');
const exampleNextBtn = document.getElementById('example-next');

const setExample = (idx) => {
  if (!EXAMPLES.length) return;
  exampleIndex = (idx + EXAMPLES.length) % EXAMPLES.length;
  const src = document.getElementById('custom-src');
  if (src) src.value = EXAMPLES[exampleIndex];
};

if (examplePrevBtn) {
  examplePrevBtn.addEventListener('click', () => setExample(exampleIndex - 1));
}
if (exampleNextBtn) {
  exampleNextBtn.addEventListener('click', () => setExample(exampleIndex + 1));
}
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
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;

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
window.currentProjectName = currentProjectName;
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
  window.currentProjectName = currentProjectName;
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
      window.currentProjectName = currentProjectName;
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
      const ctxRef = window.NM?.ctx;
      if (ctxRef && window.NM?.canvas) {
        ctxRef.fillStyle = '#000000';
        ctxRef.fillRect(0, 0, window.NM.canvas.width, window.NM.canvas.height);
      }
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
