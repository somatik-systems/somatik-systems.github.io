import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==========================================
// 1. Core Three.js Setup
// ==========================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ==========================================
// 2. Camera Setup
// ==========================================
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2, 5);
scene.add(camera);

// ==========================================
// 3. Orbit Controls (Interactive Spining & Zooming)
// ==========================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.target.set(0, 0, 0); // Ensure camera orbits the exact center

// ==========================================
// 4. Lighting Architecture
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0xe0eaff, 1);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// ==========================================
// 5. Load the GLB & Setup Progress Tracker
// ==========================================
let printerModel;
const gltfLoader = new GLTFLoader();

const loaderWrapper = document.getElementById('loader-wrapper');
const loadingText = document.getElementById('loading-text');

gltfLoader.load(
    './assets/printer.glb',
    (gltf) => {
        printerModel = gltf.scene;

        // --- NEW: Auto-Centering and Auto-Scaling Algorithm ---

        // 1. Compute the bounding box of the raw CAD model
        const box = new THREE.Box3().setFromObject(printerModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // 2. Shift the model so its exact geometric center is at (0,0,0)
        printerModel.position.x = -center.x;
        printerModel.position.y = -center.y;
        printerModel.position.z = -center.z;

        // 3. Find the largest dimension (width, height, or depth)
        const maxDim = Math.max(size.x, size.y, size.z);

        // 4. Dynamically scale it so the largest dimension is exactly 3 units wide
        if (maxDim > 0) {
            const scaleFactor = 3 / maxDim;
            printerModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        // Wrap it in a group to maintain the auto-center pivot
        const modelGroup = new THREE.Group();
        modelGroup.add(printerModel);
        scene.add(modelGroup);

        // ------------------------------------------------------

        loaderWrapper.style.opacity = '0';
        setTimeout(() => {
            loaderWrapper.style.display = 'none';
        }, 500);
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            loadingText.innerText = `Loading Digital Twin: ${Math.round(percentComplete)}%`;
        } else {
            const mbsLoaded = (xhr.loaded / (1024 * 1024)).toFixed(1);
            loadingText.innerText = `Loading Digital Twin: ${mbsLoaded} MB`;
        }
    },
    (error) => {
        console.error("Error loading GLB:", error);
        loadingText.innerText = "Error loading model. Please refresh.";
    }
);

// ==========================================
// 6. Responsive Resize & Render Loop
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
});

function tick(time) {
    lenis.raf(time);
    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);