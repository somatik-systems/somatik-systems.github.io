import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
// 3. Lighting Architecture
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
// 4. Load the GLB & Setup Progress Tracker
// ==========================================
let printerModel;
const gltfLoader = new GLTFLoader();

const loaderWrapper = document.getElementById('loader-wrapper');
const loadingText = document.getElementById('loading-text');

gltfLoader.load(
    './assets/printer.glb',
    (gltf) => {
        printerModel = gltf.scene;

        // FIX 1: Scale down FIRST
        printerModel.scale.set(0.01, 0.01, 0.01);
        printerModel.updateMatrixWorld(true);

        // FIX 2: Compute bounding box on the newly scaled model to center it perfectly
        const box = new THREE.Box3().setFromObject(printerModel);
        const center = box.getCenter(new THREE.Vector3());

        printerModel.position.x = -center.x;
        printerModel.position.y = -center.y;
        printerModel.position.z = -center.z;

        const modelGroup = new THREE.Group();
        modelGroup.add(printerModel);

        // FIX 3: Rotate 90 degrees CCW and drop slightly to ground it
        modelGroup.rotation.y = -Math.PI / 2;
        modelGroup.position.y = -0.5;

        scene.add(modelGroup);

        // Hide loader once ready
        loaderWrapper.style.opacity = '0';
        setTimeout(() => {
            loaderWrapper.style.display = 'none';
        }, 500);

        // Initialize GSAP animation
        if (typeof gsap !== 'undefined') {
            setupScrollChoreography();
        }
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            // FIX 4: Clamp percentage strictly to 100 maximum
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
// 5. GSAP Scroll Choreography
// ==========================================
function setupScrollChoreography() {
    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".specs-section",
            start: "top bottom",
            end: "top top",
            scrub: 1,
        }
    });

    // Animate camera zooming directly into the model
    tl.to(camera.position, {
        x: 0,
        y: 0,
        z: 1.5, // Z value pushes deep into the machine
        ease: "power1.inOut",
        onUpdate: () => {
            camera.lookAt(0, 0, 0);
        }
    }, 0);
}

// ==========================================
// 6. Responsive Resize & Interaction
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

// FIX 5: Attach button click to Lenis smooth scroll down to the specs page
const exploreBtn = document.getElementById('explore-inside-btn');
if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
        lenis.scrollTo('.specs-section');
    });
}

function tick(time) {
    lenis.raf(time);

    if (!gsap.isTweening(camera.position)) {
        camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);