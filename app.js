import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

let container = document.getElementById('ar-container');

let camera, scene, renderer;
let controller;
let reticle;
let model = null;
const placedModels = [];
let selectedModel = null;
let originalMaterials = new Map();

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

init();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // AR Button Setup
  const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
  document.getElementById('enter-ar-btn').replaceWith(arButton);

  // Lights
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

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

  // Load GLTF model
  const loader = new GLTFLoader();
// Elements and variables for UI
const modelSelection = document.getElementById('model-selection');
const removeSelectedBtn = document.getElementById('remove-selected-btn');
const availableModelsDiv = document.getElementById('available-models');
const toggleUIButton = document.getElementById('toggle-ui-btn');

// List of models to load
const modelsToLoad = [
  {name: 'Avocado', path: 'models/Avocdo.glb' },
   {name: 'AntiqueCamera', path: 'models/AntiqueCamera.glb' },
];

const loadedModels = new Map(); // name -> loaded model
let currentModelName = modelsToLoad[0].name; // default

// Rest of your existing variables
let camera, scene, renderer;
let controller;
let reticle;
let model = null; // current model for placement
const placedModels = [];
let selectedModel = null;
let originalMaterials = new Map();

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

init();

async function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // AR Button Setup
  const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
  document.getElementById('enter-ar-btn').replaceWith(arButton);

  // Lights
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

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

  await loadAllModels();
  setupAvailableModelsUI();
  model = loadedModels.get(currentModelName);

  // Hit Test Variables
  let hitTestSource = null;
  let hitTestSourceRequested = false;

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (!hitTestSourceRequested) {
        session.requestReferenceSpace('viewer').then((refSpace) => {
          session.requestHitTestSource({ space: refSpace }).then((source) => {
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

// Load all models defined in modelsToLoad
async function loadAllModels() {
  const loader = new GLTFLoader();
  for (let entry of modelsToLoad) {
    try {
      const gltf = await loader.loadAsync(entry.path);
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.computeBoundingBox();
          const bbox = child.geometry.boundingBox;
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          child.geometry.translate(-center.x, -center.y, -center.z);
        }
      });
      gltf.scene.scale.set(0.2, 0.2, 0.2);
      loadedModels.set(entry.name, gltf.scene);
    } catch (error) {
      console.error('Error loading model', entry.name, error);
    }
  }
}

// Setup UI buttons for available models
function setupAvailableModelsUI() {
  availableModelsDiv.innerHTML = '';

  modelsToLoad.forEach((entry) => {
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
  const buttons = Array.from(availableModelsDiv.querySelectorAll('button'));
  buttons.forEach(button => {
    if (button.textContent === currentModelName) {
      button.classList.add('selected');
    } else {
      button.classList.remove('selected');
    }
  });
}

// Modify onSelectOrSelectModel to use current selected model
function onSelectOrSelectModel() {
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObjects(placedModels, true);

  if (intersects.length > 0) {
    let intersectedModel = intersects[0].object;
    while (intersectedModel.parent && !placedModels.includes(intersectedModel)) {
      intersectedModel = intersectedModel.parent;
    }
    selectModel(intersectedModel);
  } else {
    if (reticle.visible && model) {
      const clone = model.clone();
      clone.position.setFromMatrixPosition(reticle.matrix);
      clone.quaternion.setFromRotationMatrix(reticle.matrix);
      scene.add(clone);
      placedModels.push(clone);
      selectModel(clone);
    } else {
      deselectModel();
    }
  }
}

// Toggle UI
let uiVisible = true;
toggleUIButton.addEventListener('click', () => {
  uiVisible = !uiVisible;
  if (uiVisible) {
    availableModelsDiv.classList.remove('hidden-ui');
    modelSelection.classList.remove('hidden-ui');
    toggleUIButton.textContent = 'Hide UI';
  } else {
    availableModelsDiv.classList.add('hidden-ui');
    modelSelection.classList.add('hidden-ui');
    toggleUIButton.textContent = 'Show UI';
  }
});

// The rest of your previous functions for selectModel, deselectModel, removeLastModel, updateModelSelectionUI, etc.
// ... (Keep these unchanged from previous)

// Function updateModelSelectionUI() to update placed model buttons
function updateModelSelectionUI() {
  // Remove all model buttons except Remove Selected button
  const buttons = Array.from(modelSelection.querySelectorAll('button'));
  buttons.forEach(btn => {
    if (btn !== removeSelectedBtn) btn.remove();
  });

  placedModels.forEach((modelObj, index) => {
    const btn = document.createElement('button');
    btn.textContent = `Model ${index + 1}`;
    if (modelObj === selectedModel) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      selectModel(modelObj);
      updateModelSelectionUI();
    });
    modelSelection.insertBefore(btn, removeSelectedBtn);
  });
}

// selectModel, deselectModel, removeLastModel implementations unchanged
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        child.geometry.translate(-center.x, -center.y, -center.z);
      }
    });

    model = gltf.scene;
    model.scale.set(0.2, 0.2, 0.2);
  }, undefined, (error) => {
    console.error('Error loading model:', error);
  });

  // Hit Test Variables
  let hitTestSource = null;
  let hitTestSourceRequested = false;

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (!hitTestSourceRequested) {
        session.requestReferenceSpace('viewer').then((refSpace) => {
          session.requestHitTestSource({ space: refSpace }).then((source) => {
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

// Add references for new UI elements
const modelSelection = document.getElementById('model-selection');
const removeSelectedBtn = document.getElementById('remove-selected-btn');

// Function to update model selection UI buttons
function updateModelSelectionUI() {
  // Remove all model buttons except Remove Selected button
  const buttons = Array.from(modelSelection.querySelectorAll('button'));
  buttons.forEach(btn => {
    if (btn !== removeSelectedBtn) btn.remove();
  });

  placedModels.forEach((model, index) => {
    const btn = document.createElement('button');
    btn.textContent = `Model ${index + 1}`;
    if (model === selectedModel) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      selectModel(model);
      updateModelSelectionUI();
    });
    modelSelection.insertBefore(btn, removeSelectedBtn);
  });
}
function selectModel(object) {
  if (selectedModel === object) return;
  deselectModel();
  selectedModel = object;

  originalMaterials.clear();
  selectedModel.traverse((child) => {
    if (child.isMesh) {
      originalMaterials.set(child.uuid, child.material);
      child.material = child.material.clone();
      child.material.emissive = new THREE.Color(0xffff00);
      child.material.emissiveIntensity = 0.5;
    }
  });

  updateModelSelectionUI();
}

function deselectModel() {
  if (!selectedModel) return;
  selectedModel.traverse((child) => {
    if (child.isMesh && originalMaterials.has(child.uuid)) {
      child.material.dispose();
      child.material = originalMaterials.get(child.uuid);
    }
  });
  selectedModel = null;

  updateModelSelectionUI();
}

function removeLastModel() {
  if (placedModels.length > 0) {
    const last = placedModels.pop();
    if (selectedModel === last) {
      deselectModel();
    }
    scene.remove(last);
    updateModelSelectionUI();
  }
}

// Add handler for Remove Selected button
removeSelectedBtn.addEventListener('click', () => {
  if (selectedModel) {
    const index = placedModels.indexOf(selectedModel);
    if (index !== -1) {
      placedModels.splice(index, 1);
      scene.remove(selectedModel);
      deselectModel();
      updateModelSelectionUI();
    }
  } else {
    alert('No model selected to remove.');
  }
});

// Call updateModelSelectionUI initially because placedModels can be initially empty
updateModelSelectionUI();

// Ensure updateModelSelectionUI called after placing new model
function onSelectOrSelectModel() {
  // cast ray from controller to detect tap on model
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObjects(placedModels, true);

  if (intersects.length > 0) {
    let intersectedModel = intersects[0].object;
    while (intersectedModel.parent && !placedModels.includes(intersectedModel)) {
      intersectedModel = intersectedModel.parent;
    }
    selectModel(intersectedModel);
  } else {
    if (reticle.visible && model) {
      const clone = model.clone();
      clone.position.setFromMatrixPosition(reticle.matrix);
      clone.quaternion.setFromRotationMatrix(reticle.matrix);
      scene.add(clone);
      placedModels.push(clone);
      selectModel(clone);
    } else {
      deselectModel();
    }
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
