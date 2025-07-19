# CONTINUE.md - AR Model Exhibit Demo Project Guide

## 1. Project Overview
The AR Model Exhibit Demo is a minimal web-based Augmented Reality application designed for architects to place 3D models in real world environments using their AR-capable browsers. It leverages Three.js for 3D rendering combined with WebXR for AR functionality.

- **Purpose:** Provide interactive AR visualization of architectural or object models.
- **Key Technologies:**
  - JavaScript (ES Modules)
  - Three.js for 3D graphics
  - WebXR API for augmented reality
  - GLTF models for 3D assets
  - Runs fully client-side as a static web app

- **Architecture:**
  - Single page web app with HTML, JavaScript, and external 3D model assets.
  - Core logic implemented in `app.js` managing scene, renderer, input, model loading, and AR hit testing.
  - Models stored under `models/` directory.
  - The app initializes Three.js rendering context and WebXR session for interaction.

## 2. Getting Started

### Prerequisites
- Modern web browser supporting WebXR (e.g., recent Chrome on Android with ARCore enabled).
- Local or remote static HTTP server (recommended for HTTPS or localhost for WebXR support).

### Installation
1. Clone or download the project files.
2. Ensure the directory structure remains intact (`index.html`, `app.js`, `models/` folder).
3. Serve the project directory using an HTTP server of choice (e.g., `python -m http.server` or `live-server`).

### Usage
- Open `index.html` via the local server in a compatible browser with AR capabilities.
- Use the UI buttons to select from available 3D models.
- Tap in the AR view to place models on detected surfaces.
- Select placed models to highlight and optionally remove them.

### Running Tests
- There is no automated test framework included. Manual testing requires an AR-capable device and browser.

## 3. Project Structure

- `index.html` - Entry point HTML hosting the AR container and UI.
- `app.js` - JavaScript module with full app logic:
  - Initializes Three.js scene and WebXR session.
  - Loads GLTF models.
  - Handles user input for placing/selecting/removing models.
  - Manages AR hit testing and frame rendering loop.
- `models/` - Contains GLTF 3D model files (`Avocado.glb`, `AntiqueCamera.glb`).
- `README.md` - Provides a brief overview and usage notes.

## 4. Development Workflow

- **Coding Standards:**
  - Written in modern JavaScript using ES module imports.
  - Single responsibility functions.
  - Uses const/let variable declarations.
  - Uses async/await for asynchronous model loading.

- **Testing Approach:**
  - Manual functional testing on supported AR browsers.

- **Build & Deployment:**
  - No build step needed; static files can be deployed directly to static hosting (e.g., GitHub Pages).

- **Contribution Guidelines:**
  - Follow existing JavaScript style.
  - Test additions on an AR-capable browser/device.
  - Document new features.

## 5. Key Concepts

- **WebXR Hit Test:** Enables detection of surfaces in the real world for placing virtual objects.
- **Three.js Scene Graph:** Hierarchical structure representing objects in 3D space.
- **GLTF Models:** Standard 3D model format optimized for web and AR apps.
- **Model Placement:** Cloning a model prototype and positioning it on the hit test result.
- **Model Selection:** Highlighting models for manipulation or removal.

## 6. Common Tasks

- **Adding a New Model:**
  1. Add the GLTF file to the `models/` folder.
  2. Add an entry to `modelsToLoad` array in `app.js` with name, path, and scale.
  3. The UI button for model selection will be created automatically.

- **Removing a Model:**
  - Select the model by tapping it; then click the "Remove Selected" button.

- **Adjusting Model Scale:**
  - Update the scale value in the `modelsToLoad` entry.

- **Testing on Device:**
  - Serve over HTTPS/localhost.
  - Open URL in supported mobile browser.

## 7. Troubleshooting

- **Models not showing:**
  - Confirm models loaded correctly (check console for errors).
  - Check AR hit test availability (device and browser support).

- **AR Button not appearing:**
  - Confirm browser supports WebXR and secure context.

- **Performance issues:**
  - Use fewer models or reduce model complexity.

- **No AR support on desktop:**
  - This app requires WebXR support which is mostly mobile-specific.

## 8. References

- [Three.js Documentation](https://threejs.org/docs/)
- [WebXR API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [GLTF Format](https://www.khronos.org/gltf/)
- [ARButton Source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/webxr/ARButton.js)

---

*Note: Some assumptions were made due to limited project size and lack of automated tests. Verify instructions especially for deployment and browser compatibility.*

---