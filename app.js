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
controls.target.set(0, 0, 0);

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

        // --- Auto-Centering and Auto-Scaling Algorithm ---
        const box = new THREE.Box3().setFromObject(printerModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        printerModel.position.x = -center.x;
        printerModel.position.y = -center.y;
        printerModel.position.z = -center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scaleFactor = 3 / maxDim;
            printerModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        const modelGroup = new THREE.Group();
        modelGroup.add(printerModel);

        // Rotate 90 degrees CCW and drop slightly to ground it
        modelGroup.rotation.y = -Math.PI / 2;
        modelGroup.position.y = -0.5;

        scene.add(modelGroup);

        loaderWrapper.style.opacity = '0';
        setTimeout(() => {
            loaderWrapper.style.display = 'none';
        }, 500);
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percentComplete = Math.min(100, (xhr.loaded / xhr.total) * 100);
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
// 6. Responsive Resize & Button Interaction
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const lenis = new Lenis({
    duration: 1.5,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
});

// Lock page scroll on load so mouse wheel only zooms the 3D canvas
lenis.stop();

const exploreBtn = document.getElementById('explore-inside-btn');
if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {

        // 1. Re-enable page scroll and glide down to the specs section
        lenis.start();
        lenis.scrollTo('.specs-section');

        // 2. Stop the auto-spinning
        controls.autoRotate = false;

        // 3. Tween the camera deep inside the printer
        gsap.to(camera.position, {
            x: 0,
            y: 0.2,
            z: 1.2,
            duration: 1.5,
            ease: "power2.inOut"
        });

        // 4. Center the OrbitControls target to look straight ahead
        gsap.to(controls.target, {
            x: 0,
            y: 0.2,
            z: 0,
            duration: 1.5,
            ease: "power2.inOut"
        });
    });
}

function tick(time) {
    lenis.raf(time);
    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);