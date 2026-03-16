import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ==========================================
// 1. Core Three.js Setup
// ==========================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

// We use alpha: true so the background is transparent and shows your CSS color
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Premium lighting calculation
renderer.toneMappingExposure = 1.0;

// ==========================================
// 2. Camera Setup
// ==========================================
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
// Position the camera slightly to the right and looking down
camera.position.set(3, 2, 5); 
scene.add(camera);

// ==========================================
// 3. Lighting Architecture (The "Apple" Vibe)
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Soft base light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2); // Strong key light
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0xe0eaff, 1); // Cool blue fill light
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// ==========================================
// 4. Load the GLB Asset
// ==========================================
let printerModel;
const gltfLoader = new GLTFLoader();

gltfLoader.load(
    'assets/printer.glb',
    (gltf) => {
        printerModel = gltf.scene;
        
        // Center the model and scale it (adjust scale if it imports too big/small)
        printerModel.position.set(0, -1, 0); 
        printerModel.scale.set(1, 1, 1);
        
        // Optional: Very slow idle rotation to make it feel alive
        printerModel.rotation.y = -Math.PI / 4; 
        
        scene.add(printerModel);
        console.log("Printer loaded successfully!");
    },
    (progress) => {
        console.log(`Loading: ${(progress.loaded / progress.total * 100)}%`);
    },
    (error) => {
        console.error("Error loading the GLB file:", error);
    }
);

// ==========================================
// 5. Responsive Resize & Animation Loop
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize Lenis Smooth Scrolling (since we imported the CDN in HTML)
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
});

function tick(time) {
    // Update smooth scroll
    lenis.raf(time);
    
    // Slowly rotate the model if it's loaded (just for Phase 1 idle state)
    if(printerModel) {
        printerModel.rotation.y += 0.001; 
    }

    // Render the 3D scene
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

// Start the loop
window.requestAnimationFrame(tick);