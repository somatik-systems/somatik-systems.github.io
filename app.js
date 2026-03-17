import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
// NEW: Import for physical light reflections
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

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
// FIX: Bumped exposure to 1.2 to make the metal reflections "ping"
renderer.toneMappingExposure = 1.2;

// Initializing RectAreaLight (essential for metallic highlights)
RectAreaLightUniformsLib.init();

// ==========================================
// 2. Camera Setup
// ==========================================
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2, 5);
scene.add(camera);

// ==========================================
// 3. Orbit Controls
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
// 4. Lighting Architecture (Premium Metal Look)
// ==========================================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
    .setPath('assets/')
    .load('royal_esplanade_1k.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
    });

// FIX: Added high-intensity RectAreaLight for the metallic "rim" highlight
// This mimics a professional studio softbox
const rectLight = new THREE.RectAreaLight(0xffffff, 8, 4, 10);
rectLight.position.set(5, 5, 2);
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // Dropped ambient to increase contrast
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

        printerDoor = printerModel.getObjectByName('Door Assembly') || printerModel.getObjectByName('Door_Assembly');

        if (!printerDoor) {
            printerModel.traverse((child) => {
                if (!printerDoor && child.name.toLowerCase().includes('door')) {
                    printerDoor = child;
                    console.log("✅ Door found via fallback:", child.name);
                }
            });
        }

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
        }
    },
    (error) => {
        console.error("Error loading GLB:", error);
        loadingText.innerText = "Error loading model. Please refresh.";
    }
);

// ==========================================
// 6. Interactions & Page Navigation
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const lenis = new Lenis({ duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
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

        gsap.to(camera.position, { x: 0, y: 0.6, z: 2.5, duration: 1.5, ease: "power2.inOut" });
        gsap.to(controls.target, { x: 0, y: 0.6, z: 0, duration: 1.5, ease: "power2.inOut" });

        if (printerDoor) {
            gsap.to(printerDoor.rotation, { z: -1.5, duration: 1.5, ease: "power2.inOut" });
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

// Waitlist / Logo logic
const ctaScrollBtn = document.getElementById('cta-scroll-btn');
const navWaitlistBtn = document.getElementById('nav-waitlist-btn');
const logoBtn = document.querySelector('.logo');

function scrollToWaitlist(e) {
    if (e) e.preventDefault();
    lenis.start();
    lenis.scrollTo('#waitlist');
    setTimeout(() => { lenis.stop(); }, 1500);
}
if (ctaScrollBtn) ctaScrollBtn.addEventListener('click', scrollToWaitlist);
if (navWaitlistBtn) navWaitlistBtn.addEventListener('click', scrollToWaitlist);
if (logoBtn) {
    logoBtn.addEventListener('click', () => {
        lenis.start();
        lenis.scrollTo(0);
        setTimeout(() => { lenis.stop(); }, 1500);
        controls.enableRotate = true;
        controls.autoRotate = true;
        gsap.to(camera.position, { x: 3, y: 2, z: 5, duration: 1.5, ease: "power2.inOut" });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });
        if (printerDoor) gsap.to(printerDoor.rotation, { z: 0, duration: 1.5, ease: "power2.inOut" });
    });
}

function tick(time) {
    lenis.raf(time);
    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);