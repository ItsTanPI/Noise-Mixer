# Noise Mixer

A web-based procedural noise generation and visualization tool. Layer multiple noise types, customize them in real-time, and export the result as a standalone noise generator.

## 🎨 Live Demo

**[Try Noise Mixer Live](https://itstanpi.github.io/Noise-Mixer/)**

## Purpose

Noise Mixer was built as a **utility tool** for generating procedural noise patterns. It's designed to be used in upcoming projects being developed with [PiGL.js](https://github.com/ItsTanPI/PiGL.js).

## What is it?

Noise Mixer lets you create complex procedural textures and patterns by combining different noise algorithms (Perlin, Simplex, Worley, etc.) into layers. Each layer can be customized with scale, octaves, masks, and blending modes. What you see on the canvas is exactly what you get.

## Development
- **Acknowledgment**: System architecture and engineering designed by Me(TanPi), with coding & docs assistance from AI under proper reviewing and supervision.
## How to Use

1. **Open** `index.html` in any modern web browser (or use the [live demo](https://itstanpi.github.io/Noise-Mixer/))
2. **Add layers** - Use the "+ Add layer" button on the right panel
3. **Global Controls** - Click the arrow next to "Global Controls" to expand/collapse the settings panel:
   - **Color**: Choose a color scheme to preview your noise
   - **Resolution**: Set render resolution for performance vs quality
   - **Pan X/Y**: Move around the noise space
   - **Zoom**: Zoom in/out on the canvas
   - **Z Position**: Control the z-axis for animation
4. **Adjust parameters** - Each layer has:
   - **Type**: Choose the noise algorithm
   - **Scale**: How big the features are (larger = smoother)
   - **Octaves**: How many levels of detail
   - **Seed**: Different number = different pattern
   - **Blend**: How to combine with layers below (average, multiply, add, etc.)
   - **Mask**: Apply a shape (circle, gradient, square, etc.)
   - **Weight/Contrast/Threshold**: Fine-tune the output
5. **Explore** - Use mouse to pan, scroll to zoom
6. **Export** - Save your creation for use elsewhere

### Quick Tips
- Left-click + drag to pan the canvas
- Scroll wheel to zoom in/out
- Change **Color** on the left to preview with different color schemes
- Drag layers to reorder them
- Click the eye icon to hide/show layers
- Collapse/expand **Global Controls** and layer cards by clicking the arrows
- **Mobile-friendly** - Fully responsive UI that works on tablets and phones

## Exporting & Using the Noise Generator

### Export as JavaScript
1. Create your noise pattern in the mixer
2. Click **"Export as JS"** button
3. Enter a project name (e.g., "MyNoise")
4. A bundled `.js` file downloads with everything you need

### Using the Exported File

The exported JS file is completely standalone—no dependencies needed. It includes NoiseLib bundled inside.

```html
<script src="MyNoise.js"></script>
<script>
  // Get a noise value at any (x, y) position
  const value = MyNoise.getValue(100, 50);
  console.log(value); // Number between 0 and 1

  // With z coordinate (for animation/time)
  const value = MyNoise.getValue(100, 50, 5);

  // Generate terrain heightmap
  const heightmap = [];
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const height = MyNoise.getValue(x, y, 0);
      heightmap.push(height);
    }
  }

  // Use in a game or visualization
  function animate(time) {
    const noise = MyNoise.getValue(mouseX, mouseY, time * 0.01);
    canvas.style.backgroundColor = `rgb(${noise * 255}, 100, 150)`;
    requestAnimationFrame(animate);
  }
  animate(0);

  // Access configuration
  const state = MyNoise.getState();    // Global state (zoom, pan, etc.)
  const layers = MyNoise.getLayers();  // Layer definitions
  
  // Direct access to NoiseLib for more control
  const perlin = MyNoise.NoiseLib.getNoiseFunction('perlin');
  const rawValue = perlin(x, y, z, seed, { scale: 60, octaves: 4, falloff: 0.5 });
</script>
```

### What's Included in the Export

The exported file contains:
- **NoiseLib** - All noise algorithms bundled
- **Your configuration** - All layers, parameters, and settings
- **getValue()** - Simple function to get noise at any point
- **Full state management** - Colors, masks, blending modes all applied

Just include the file and call `getValue(x, y)` to get your procedural noise.

## Saving & Loading Configurations

### Save Project
1. Click **File > Save** in the menu bar
2. A `.json` file downloads containing:
   - All layers and their parameters
   - Global state (zoom, pan, resolution, color scheme)
   - All custom functions you've created
   - All color schemes you've edited
   - Project name and timestamp

The saved file preserves your **entire workspace** - everything is stored in one JSON file.

### Load Project
1. Click **File > Load** in the menu bar
2. Select a previously saved `.json` project file
3. Your complete workspace restores:
   - All layers with exact parameters
   - Custom noise functions
   - Color schemes
   - Camera position and zoom
   - Project name

### What Gets Saved

Each project file includes:
```json
{
  "version": "1.0",
  "timestamp": "2026-04-14T...",
  "projectName": "My Terrain",
  "globalState": {
    "res": 2,
    "color": "terrain",
    "offsetX": 0,
    "offsetY": 0,
    "zoom": 1
  },
  "layers": [ ... ],
  "colorSchemes": { ... },
  "customFunctions": [ ... ]
}
```

---

## Building & Exporting

### Export as JavaScript (Build)
1. Click **File > Build** in the menu bar
2. A standalone `.js` file downloads with your noise generator
3. This file includes:
   - **NoiseLib bundled** - All noise algorithms included
   - **Your configuration** - All layers, custom functions, color schemes
   - **getValue()** function - Simple API to get noise values
   - **No dependencies** - Works completely offline

#### Using Your Built Noise Generator

```html
<script src="MyNoise.js"></script>
<script>
  // Get noise value at position (x, y)
  const value = MyNoise.getValue(100, 50);
  console.log(value); // 0 to 1

  // With z coordinate for animation
  const animValue = MyNoise.getValue(100, 50, time * 0.01);

  // Generate a heightmap
  const terrain = [];
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      terrain.push(MyNoise.getValue(x, y));
    }
  }

  // Access project metadata
  console.log(MyNoise.projectName);     // Your project name
  console.log(MyNoise.getState());      // Global state
  console.log(MyNoise.getLayers());     // Layer definitions
  console.log(MyNoise.NoiseLib);        // Full NoiseLib for advanced use
  console.log(MyNoise.customFunctions); // Your custom functions
</script>
```

#### Build Output Example

Your exported file structure:
```javascript
const MyNoise = (function() {
  const globalState = { ... };
  const layers = [ ... ];
  const customFunctions = { ... };
  
  function getValue(x, y, z = 0) {
    // Applies all layers, blending, and effects
    // Returns final noise value (0-1)
  }
  
  return {
    getValue,
    getState: () => ({ ...globalState }),
    getLayers: () => [...layers],
    NoiseLib,
    customFunctions,
    projectName: 'MyNoise'
  };
})();
```

---

## Saving & Loading Configurations

### Export as JSON
1. Click **File > Save** to download your project
2. This saves your complete setup as a human-readable JSON file
3. Edit the JSON manually to tweak parameters or share with others

### Import JSON
1. Click **File > Load** 
2. Select a previously saved `.json` file
3. Your entire setup loads instantly

### Workflow Example

1. **Build** - Create a complex noise setup in the mixer
2. **Save** - Click "File > Save" → saves `terrain_v1.json`
3. **Iterate** - Modify parameters, save new versions
4. **Load** - Import `terrain_v1.json` to restore that exact setup
5. **Export** - Click "File > Build" to generate production-ready JavaScript

## Color Schemes

### Custom Color Schemes

You can fully customize color schemes as JSON. Three types are supported:

**Gradient Type** - Smooth interpolation between color stops
```json
{
  "name": "Ocean Gradient",
  "type": "gradient",
  "stops": [
    { "value": 0, "r": 0, "g": 0, "b": 50 },
    { "value": 0.5, "r": 30, "g": 150, "b": 200 },
    { "value": 1, "r": 255, "g": 255, "b": 255 }
  ]
}
```

**Stops Type** - Step through discrete colors at thresholds
```json
{
  "name": "Discrete Terrain",
  "type": "stops",
  "stops": [
    { "value": 0.3, "r": 50, "g": 100, "b": 200 },
    { "value": 0.5, "r": 200, "g": 180, "b": 100 },
    { "value": 0.8, "r": 100, "g": 150, "b": 60 },
    { "value": 1.0, "r": 255, "g": 255, "b": 255 }
  ]
}
```

**Sine Type** - Procedural sine-wave colors
```json
{
  "name": "Neon Wave",
  "type": "sine",
  "phases": [0, 2.1, 4.2],
  "amplitude": 200,
  "offset": 55
}
```

### Managing Color Schemes

1. **Edit Schemes** - Click "Edit Scheme" to create or modify color schemes as JSON
2. **Export Schemes** - Click "Export Schemes" to save all your color schemes as a `.json` file
3. **Import Schemes** - Click "Import Schemes" to load color schemes from a file

You can share color scheme files with others or use them across different projects.

## Features

- Real-time multi-layer mixing
- Custom function injection
- Save/load configurations
- **Custom color schemes** (editable as JSON)
- **Collapsible UI panels** - Global Controls and layers can be expanded/collapsed
- **Mobile-responsive** - Optimized for all screen sizes (desktop, tablet, mobile)
- **Touch-friendly** - Large buttons and menus for touch devices
- Export as JSON or JavaScript code
- Works offline, no dependencies
- One-click "New Project" - Completely replaces existing project with fresh start

---

## Custom Noise Functions

### Inject Custom Functions
You can create your own noise functions using JavaScript:

1. Click **"+ Custom Noise"** button on the right panel
2. Edit the function code in the textarea
3. Click **"Inject & add"** to compile and add it as a new layer

### Function Signature

All noise functions must have this signature:
```javascript
function myNoise(x, y, z, seed, params) {
  // x, y: coordinates in noise space
  // z: depth/time coordinate
  // seed: randomness seed
  // params: custom values you define in the UI
  // example: { scale: 60, angle: 30, warpStrength: 0.8 }
  
  // Must return a value between 0 and 1
  return (value + 1) / 2;
}
```

### Defining Parameters (UI)
Use **Custom Params → + Param** to define each parameter and its UI type:
- **range** (slider)
- **toggle** (checkbox)
- **number** (numeric input)

These params are saved with the project and exported with the JS build.

### Examples

**Ripple Pattern**
```javascript
function ripple(x, y, z, seed, params) {
  let r = Math.sqrt((x - 240) ** 2 + (y - 180) ** 2);
  const scale = params.scale ?? 60;
  return (Math.sin(r / scale - z * 3) + 1) / 2;
}
```

**Spiral Pattern**
```javascript
function spiral(x, y, z, seed, params) {
  let dx = x - 240, dy = y - 180;
  let a = Math.atan2(dy, dx), r = Math.sqrt(dx*dx + dy*dy);
  const scale = params.scale ?? 60;
  return (Math.sin(a * 4 + r / scale - z * 2) + 1) / 2;
}
```

**Plasma Effect**
```javascript
function plasma(x, y, z, seed, params) {
  const scale = params.scale ?? 60;
  return (Math.sin(x/scale) + Math.sin(y/scale) + Math.sin((x+y)/scale) + 
          Math.sin(Math.sqrt(x*x+y*y)/scale + z)) / 4 * 0.5 + 0.5;
}
```

### Available Examples
Click **"Random example"** to see more custom function patterns to use as inspiration.

### Using Custom Functions

Once injected, your function:
- Appears in the **Type** dropdown for new layers
- Can be used like any built-in noise type
- Is saved with your project
- Is exported with your built JavaScript file

---

## Menu Bar Reference

### File Menu
- **New** - Create a new project (clears all layers)
- **Save** - Download project as JSON
- **Load** - Import previously saved project
- **Build** - Export as standalone JavaScript with bundled NoiseLib

### Edit Menu
- **Edit Colors** - Open color scheme editor
- **Import Color Schema** - Load custom color schemes from file
- **Export Color Schema** - Save your color schemes as JSON

### About Menu
- **About Application** - View application info and credits

### Theme Toggle
- Click the **moon/sun icon** in the top-right to toggle dark/light mode
- Your preference is automatically saved