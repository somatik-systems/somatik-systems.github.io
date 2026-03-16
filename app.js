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
// 4. Load the GLB & Setup Animation
// ==========================================
let printerModel;
let doorAssembly = null;
let extruderTarget = new THREE.Vector3(0, 0, 0);

const gltfLoader = new GLTFLoader();

// Fixed relative path for gh-pages
gltfLoader.load(
    './assets/printer.glb',
    (gltf) => {
        printerModel = gltf.scene;
        printerModel.position.set(0, -1, 0);

        // Scale down the CAD model (assumes mm to meters conversion)
        printerModel.scale.set(0.01, 0.01, 0.01);

        // Traverse to find specific meshes
        printerModel.traverse((child) => {
            if (child.isMesh && child.name === 'Door_Assembly') {
                doorAssembly = child;
            }
            if (child.isMesh && child.name === 'Extruder_Head') {
                child.getWorldPosition(extruderTarget);
            }
        });

        scene.add(printerModel);

        if (typeof gsap !== 'undefined') {
            setupScrollChoreography();
        }
    }
);

// ==========================================
// 5. GSAP Scroll Choreography
// ==========================================
function setupScrollChoreography() {
    gsap.registerPlugin(ScrollTrigger);

    const lookAtProxy = { x: 0, y: 0, z: 0 };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".specs-section",
            start: "top bottom",
            end: "top top",
            scrub: 1,
        }
    });

    if (doorAssembly) {
        tl.to(doorAssembly.rotation, {
            y: doorAssembly.rotation.y + (120 * Math.PI) / 180,
            ease: "power1.inOut"
        }, 0);
    }

    tl.to(camera.position, {
        x: 0,
        y: 0.5,
        z: 2.5,
        ease: "power1.inOut",
        onUpdate: () => {
            camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z);
        }
    }, 0);

    tl.to(lookAtProxy, {
        x: extruderTarget.x,
        y: extruderTarget.y,
        z: extruderTarget.z,
        ease: "power1.inOut"
    }, 0);
}

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

    if (!gsap.isTweening(camera.position)) {
        camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);