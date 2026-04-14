# Noise Mixer

A web-based procedural noise generation and visualization tool. Layer multiple noise types, customize them in real-time, and export the result as a standalone noise generator.

## Purpose

Noise Mixer was built as a **utility tool** for generating procedural noise patterns. It's designed to be used in upcoming projects being developed with [PiGL.js](https://github.com/ItsTanPI/PiGL.js).

## What is it?

Noise Mixer lets you create complex procedural textures and patterns by combining different noise algorithms (Perlin, Simplex, Worley, etc.) into layers. Each layer can be customized with scale, octaves, masks, and blending modes. What you see on the canvas is exactly what you get.

## Development
- **Acknowledgment**: System architecture and engineering designed by Me(TanPi), with coding & docs assistance from AI under proper reviewing and supervision.
## How to Use

1. **Open** `index.html` in any modern web browser
2. **Add layers** - Use the "+ Add layer" button on the right panel
3. **Adjust parameters** - Each layer has:
   - **Type**: Choose the noise algorithm
   - **Scale**: How big the features are (larger = smoother)
   - **Octaves**: How many levels of detail
   - **Seed**: Different number = different pattern
   - **Blend**: How to combine with layers below (average, multiply, add, etc.)
   - **Mask**: Apply a shape (circle, gradient, square, etc.)
   - **Weight/Contrast/Threshold**: Fine-tune the output
4. **Explore** - Use mouse to pan, scroll to zoom
5. **Export** - Save your creation for use elsewhere

### Quick Tips
- Left-click + drag to pan the canvas
- Scroll wheel to zoom in/out
- Change **Color** on the left to preview with different color schemes
- Drag layers to reorder them
- Click the eye icon to hide/show layers

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
  const rawValue = perlin(x, y, z, scale, octaves, falloff, seed, weight, contrast, threshold);
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

### Export as JSON
1. Create your noise pattern setup
2. Click **"Export as JSON"** button
3. Enter a project name
4. A `.json` file downloads containing all your layer configurations

### Using JSON Export

The JSON file stores your complete setup in a human-readable format:

```json
{
  "version": "1.0",
  "projectName": "MyTerrainNoise",
  "globalState": {
    "res": 2,
    "color": "terrain",
    "zoom": 1,
    "offsetX": 0,
    "offsetY": 0
  },
  "layers": [
    {
      "type": "perlin",
      "scale": 32,
      "octaves": 4,
      "falloff": 0.5,
      "seed": 12345,
      "weight": 1,
      "contrast": 1.25,
      "blend": "avg",
      "mask": "none",
      "visible": true
    },
    {
      "type": "billowy",
      "scale": 100,
      "octaves": 1,
      "falloff": 0.5,
      "seed": 0,
      "weight": 0.8,
      "contrast": 2,
      "blend": "mul",
      "mask": "circle",
      "visible": true
    }
  ],
  "customFunctions": []
}
```

You can edit this JSON file manually to tweak parameters or share it with others.

### Import JSON
1. Click **"Import JSON"** button
2. Select a previously exported `.json` file
3. Your entire setup (all layers, parameters, colors, etc.) loads instantly

### Workflow Example

1. **Build** - Create a complex noise setup in the mixer
2. **Save as JSON** - `click "Export as JSON"` → save as `terrain_v1.json`
3. **Iterate** - Modify parameters and save new versions
4. **Load** - Import `terrain_v1.json` to go back to that exact setup
5. **Export as JS** - When happy, click `"Export as JS"` to get a production-ready noise generator

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
- Export as JSON or JavaScript code
- Works offline, no dependencies