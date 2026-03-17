import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Updated: Swapped RoomEnvironment for RGBELoader
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ==========================================
// 1. Core Three.js Setup & Tone Mapping
// ==========================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

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
controls.enableRotate = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.target.set(0, 0, 0);

// ==========================================
// 4. Lighting Architecture (Photorealistic HDRI)
// ==========================================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Updated: Implemented your local HDR file for high-end reflections
new RGBELoader()
    .setPath('assets/')
    .load('royal_esplanade_1k.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        // scene.background = texture; // Uncomment if you want to see the studio background
    });

const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// ==========================================
// 5. Load the GLB & Bind Kinematics
// ==========================================
let printerModel;
let printerDoor = null;
const gltfLoader = new GLTFLoader();

const loaderWrapper = document.getElementById('loader-wrapper');
const loadingText = document.getElementById('loading-text');

gltfLoader.load(
    './assets/printer_black.glb',
    (gltf) => {
        printerModel = gltf.scene;

        // FIX: Check for exact match OR underscore match first
        printerDoor = printerModel.getObjectByName('Door Assembly') || printerModel.getObjectByName('Door_Assembly');

        // FIX: If exact name fails, safely find the FIRST parent node with "door" in the name and STOP overwriting it.
        if (!printerDoor) {
            printerModel.traverse((child) => {
                if (!printerDoor && child.name.toLowerCase().includes('door')) {
                    printerDoor = child;
                    console.log("✅ Door found via fallback:", child.name);
                }
            });
        } else {
            console.log("✅ Exact Door Assembly found:", printerDoor.name);
        }

        if (!printerDoor) {
            console.error("❌ CRITICAL: Could not find any part of the model with 'Door' in its name.");
        }

        // Fix CAD Orientation
        printerModel.rotation.x = -Math.PI / 2;
        printerModel.updateMatrixWorld(true);

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

        modelGroup.position.y = -1.1;

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
// 6. Responsive Resize & Interactions
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

lenis.stop();

// Explore Inside
const exploreInBtn = document.getElementById('explore-inside-btn');
if (exploreInBtn) {
    exploreInBtn.addEventListener('click', () => {
        lenis.start();
        lenis.scrollTo('.specs-section');
        setTimeout(() => { lenis.stop(); }, 1500);

        controls.autoRotate = false;
        controls.enableRotate = false;
        controls.enablePan = true;

        gsap.to(camera.position, { x: 0, y: -1, z: 2.5, duration: 1.5, ease: "power2.inOut" });
        gsap.to(controls.target, { x: 0, y: -1, z: 0, duration: 1.5, ease: "power2.inOut" });

        if (printerDoor) {
            gsap.to(printerDoor.rotation, { z: -1.5, duration: 1.5, ease: "power2.inOut" });
        } else {
            console.warn("GSAP skipped: printerDoor is null");
        }
    });
}

// Return Outside
const exploreOutBtn = document.getElementById('explore-outside-btn');
if (exploreOutBtn) {
    exploreOutBtn.addEventListener('click', () => {
        lenis.start();
        lenis.scrollTo(0);
        setTimeout(() => { lenis.stop(); }, 1500);

        controls.enableRotate = true;
        controls.autoRotate = true;

        gsap.to(camera.position, { x: 3, y: 2, z: 5, duration: 1.5, ease: "power2.inOut" });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });

        if (printerDoor) {
            gsap.to(printerDoor.rotation, { z: 0, duration: 1.5, ease: "power2.inOut" });
        }
    });
}

// Waitlist / CTA Navigation
const ctaScrollBtn = document.getElementById('cta-scroll-btn');
const navWaitlistBtn = document.getElementById('nav-waitlist-btn');
function scrollToWaitlist(e) {
    if (e) e.preventDefault();
    lenis.start();
    lenis.scrollTo('#waitlist');
    setTimeout(() => { lenis.stop(); }, 1500);
}
if (ctaScrollBtn) ctaScrollBtn.addEventListener('click', scrollToWaitlist);
if (navWaitlistBtn) navWaitlistBtn.addEventListener('click', scrollToWaitlist);

// Logo Button
const logoBtn = document.querySelector('.logo');
if (logoBtn) {
    logoBtn.addEventListener('click', () => {
        lenis.start();
        lenis.scrollTo(0);
        setTimeout(() => { lenis.stop(); }, 1500);

        controls.enableRotate = true;
        controls.autoRotate = true;
        gsap.to(camera.position, { x: 3, y: 2, z: 5, duration: 1.5, ease: "power2.inOut" });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });

        if (printerDoor) {
            gsap.to(printerDoor.rotation, { z: 0, duration: 1.5, ease: "power2.inOut" });
        }
    });
}

function tick(time) {
    lenis.raf(time);
    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);