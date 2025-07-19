// Cleaned full app.js
// -----------------------------------------------------------------------------
// Imports
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

// -----------------------------------------------------------------------------
// DOM Elements
const container = document.getElementById('ar-container');
const modelSelection = document.getElementById('model-selection');
const removeSelectedBtn = document.getElementById('remove-selected-btn');
const availableModelsDiv = document.getElementById('available-models');
const toggleUIButton = document.getElementById('toggle-ui-btn');
const enterARPlaceholderBtn = document.getElementById('enter-ar-btn'); // Will be replaced by ARButton

// -----------------------------------------------------------------------------
// Global State Variables
let camera, scene, renderer;
let controller, reticle;
let model = null;                 // Currently chosen model prototype (not yet placed)
const placedModels = [];          // Array of placed model root objects
let selectedModel = null;         // Currently selected placed model
const originalMaterials = new Map(); // Store original materials per mesh when highlighting

// Raycasting helpers
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// Models configuration
const modelsToLoad = [
  { name: 'Avocado', path: 'models/Avocado.glb', scale: 5 },
  { name: 'AntiqueCamera', path: 'models/AntiqueCamera.glb', scale: 1 },
];

// Loaded model prototypes (Map: name -> THREE.Group)
const loadedModels = new Map();

// Currently selected model name (by UI button)
let currentModelName = modelsToLoad[0].name;

// UI visibility flag
let uiVisible = true;

// -----------------------------------------------------------------------------
// Initialization Entry Point
init(); // Call exactly once

// -----------------------------------------------------------------------------
// Main init (async to await asset loading)
async function init() {
  // Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // Lighting
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // XR Button (replace placeholder)
  const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
  if (enterARPlaceholderBtn) enterARPlaceholderBtn.replaceWith(arButton);
  else document.body.appendChild(arButton);

  // Controller
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelectOrSelectModel);
  scene.add(controller);

  // Reticle
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.35, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Load models
  await loadAllModels();

  // Setup initial UI
  setupAvailableModelsUI();
  model = loadedModels.get(currentModelName);
  updateModelSelectionUI();

  // Event listeners
  window.addEventListener('resize', onWindowResize);
  removeSelectedBtn?.addEventListener('click', onRemoveSelected);
  toggleUIButton?.addEventListener('click', toggleUIVisibility);

  // Start AR loop / hit test handling
  setupXRHitTestLoop();
}

// -----------------------------------------------------------------------------
// Asset Loading
async function loadAllModels() {
  const loader = new GLTFLoader();

  for (const entry of modelsToLoad) {
    try {
      const gltf = await loader.loadAsync(entry.path);

      // Recentering & optional adjustments
      gltf.scene.traverse(child => {
        if (child.isMesh) {
          child.geometry.computeBoundingBox();
          const bbox = child.geometry.boundingBox;
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          child.geometry.translate(-center.x, -center.y, -center.z);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const root = gltf.scene;
      const s = entry.scale ?? 0.2;
      root.scale.set(s, s, s);

      loadedModels.set(entry.name, root);
    } catch (e) {
      console.error('Error loading model', entry.name, e);
    }
  }
}

// -----------------------------------------------------------------------------
// UI Construction & Updates
function setupAvailableModelsUI() {
  if (!availableModelsDiv) return;
  availableModelsDiv.innerHTML = '';
  modelsToLoad.forEach(entry => {
    const btn = document.createElement('button');
    btn.textContent = entry.name;
    if (entry.name === currentModelName) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      currentModelName = entry.name;
      model = loadedModels.get(currentModelName);
      updateAvailableModelsUI();
    });
    availableModelsDiv.appendChild(btn);
  });
}

function updateAvailableModelsUI() {
  if (!availableModelsDiv) return;
  const buttons = availableModelsDiv.querySelectorAll('button');
  buttons.forEach(btn => {
    const isCurrent = btn.textContent === currentModelName;
    btn.classList.toggle('selected', isCurrent);
  });
}

function updateModelSelectionUI() {
  if (!modelSelection || !removeSelectedBtn) return;

  // Remove old dynamic buttons (keep the remove button)
  const stale = Array.from(modelSelection.querySelectorAll('button')).filter(b => b !== removeSelectedBtn);
  stale.forEach(b => b.remove());

  placedModels.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.textContent = `Model ${i + 1}`;
    if (m === selectedModel) btn.classList.add('selected');
    btn.addEventListener('click', () => selectModel(m));
    modelSelection.insertBefore(btn, removeSelectedBtn);
  });
}

function toggleUIVisibility() {
  uiVisible = !uiVisible;
  [availableModelsDiv, modelSelection].forEach(el => {
    if (!el) return;
    el.classList.toggle('hidden-ui', !uiVisible);
  });
  if (toggleUIButton) toggleUIButton.textContent = uiVisible ? 'Hide UI' : 'Show UI';
}

// -----------------------------------------------------------------------------
// Selection Logic
function onSelectOrSelectModel() {
  // Raycast first to see if we clicked an existing model
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObjects(placedModels, true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj.parent && !placedModels.includes(obj)) obj = obj.parent;
    selectModel(obj);
    return;
  }

  // Otherwise place new model if reticle visible
  if (reticle.visible && model) {
    const clone = model.clone(true);
    clone.position.setFromMatrixPosition(reticle.matrix);
    clone.quaternion.setFromRotationMatrix(reticle.matrix);
    scene.add(clone);
    placedModels.push(clone);
    selectModel(clone);
  } else {
    deselectModel();
  }
}

function selectModel(object) {
  if (selectedModel === object) return; // Already selected
  deselectModel();
  selectedModel = object;
  originalMaterials.clear();
  selectedModel.traverse(child => {
    if (child.isMesh) {
      originalMaterials.set(child.uuid, child.material);
      child.material = child.material.clone();
      if (child.material.emissive === undefined) {
        child.material.emissive = new THREE.Color(0x000000);
      }
      child.material.emissive = new THREE.Color(0xffff00);
      child.material.emissiveIntensity = 0.5;
    }
  });
  updateModelSelectionUI();
}

function deselectModel() {
  if (!selectedModel) return;
  selectedModel.traverse(child => {
    if (child.isMesh && originalMaterials.has(child.uuid)) {
      child.material.dispose();
      child.material = originalMaterials.get(child.uuid);
    }
  });
  selectedModel = null;
  originalMaterials.clear();
  updateModelSelectionUI();
}

function onRemoveSelected() {
  if (!selectedModel) {
    alert('No model selected to remove.');
    return;
  }
  const idx = placedModels.indexOf(selectedModel);
  if (idx !== -1) placedModels.splice(idx, 1);
  scene.remove(selectedModel);
  deselectModel();
}

// -----------------------------------------------------------------------------
// XR Hit Test & Render Loop
function setupXRHitTestLoop() {
  let hitTestSource = null;
  let hitTestSourceRequested = false;

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (!hitTestSourceRequested) {
        session.requestReferenceSpace('viewer').then(viewerSpace => {
          session.requestHitTestSource({ space: viewerSpace }).then(source => {
            hitTestSource = source;
          });
        });

        session.addEventListener('end', () => {
          hitTestSourceRequested = false;
          hitTestSource = null;
        });

        hitTestSourceRequested = true;
      }

      if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else {
          reticle.visible = false;
        }
      }
    }

    renderer.render(scene, camera);
  });
}

// -----------------------------------------------------------------------------
// Utilities
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -----------------------------------------------------------------------------
// Optional: Debug helpers (comment out if not needed)
// window.__debug = { THREE, scene, placedModels };
// console.log('Debug handle at window.__debug');

// End of file
