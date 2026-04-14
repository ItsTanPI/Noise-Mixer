// Color Schemes Management Module

function updateColorSelectDropdown() {
  const colorSelect = document.getElementById('g-color');
  if (!colorSelect) return;
  
  // Clear existing options
  colorSelect.innerHTML = '';
  
  // Add all color schemes as options
  Object.keys(colorSchemes).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = colorSchemes[key].name || key;
    colorSelect.appendChild(option);
  });
  
  // Set the current color
  const currentColor = gState.color || 'gray';
  colorSelect.value = currentColor;
}

function saveColorSchemes() {
  const data = JSON.stringify(colorSchemes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'color_schemes.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadColorSchemes(jsonString) {
  return new Promise((resolve, reject) => {
    try {
      const schemes = JSON.parse(jsonString);
      if (typeof schemes !== 'object') {
        reject(new Error('Invalid color schemes format'));
        return;
      }

      // Merge loaded schemes with existing ones
      Object.assign(colorSchemes, schemes);
      
      // Update both dropdowns
      updateColorSelectDropdown();
      updateColorSchemesModalDropdown();

      resolve('Color schemes loaded successfully');
    } catch (e) {
      reject(new Error('Error loading color schemes: ' + e.message));
    }
  });
}

function updateColorSchemesModalDropdown() {
  const schemeSelect = document.getElementById('color-scheme-select');
  if (!schemeSelect) return;
  
  schemeSelect.innerHTML = '';
  Object.keys(colorSchemes).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = colorSchemes[key].name || key;
    schemeSelect.appendChild(option);
  });
  
  const currentColor = gState.color || 'gray';
  schemeSelect.value = currentColor;
}

function updateColorSchemesDropdown() {
  updateColorSelectDropdown();
  updateColorSchemesModalDropdown();
}
