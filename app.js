// Updated app.js to import ES modules directly from CDN

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

let container = document.getElementById('ar-container');

let camera, scene, renderer;
let controller;
let reticle;
let model = null;

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

  // Light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Controller
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Reticle for visualizing surface
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x0fff0, side: THREE.DoubleSide })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Loading sample model
  const loader = new GLTFLoader();
  loader.load('models/sample-model.glb', (gltf) => {
    model = gltf.scene;
    model.scale.set(0.2, 0.2, 0.2); // Adjust scale to fit scene
  }, undefined, (error) => {
    console.error('Error loading model:', error);
  });

  // Hit test source for placing model
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

function onSelect() {
  if (reticle.visible && model) {
    const clone = model.clone();
    clone.position.setFromMatrixPosition(reticle.matrix);
    clone.quaternion.setFromRotationMatrix(reticle.matrix);
    scene.add(clone);
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
