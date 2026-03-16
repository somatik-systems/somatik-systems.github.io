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
let extruderTarget = new THREE.Vector3(0, 0, 0); // Fallback target

const gltfLoader = new GLTFLoader();

gltfLoader.load(
    'assets/printer.glb',
    (gltf) => {
        printerModel = gltf.scene;
        printerModel.position.set(0, -1, 0);

        // Traverse to find specific meshes
        printerModel.traverse((child) => {
            if (child.isMesh && child.name === 'Door_Assembly') {
                doorAssembly = child;
            }
            if (child.isMesh && child.name === 'Extruder_Head') {
                // Get the exact world coordinates of the extruder to look at
                child.getWorldPosition(extruderTarget);
            }
        });

        scene.add(printerModel);
        
        // Ensure GSAP is loaded before firing
        if(typeof gsap !== 'undefined') {
            setupScrollChoreography();
        }
    }
);

// ==========================================
// 5. GSAP Scroll Choreography
// ==========================================
function setupScrollChoreography() {
    gsap.registerPlugin(ScrollTrigger);

    // We create a proxy object to tween the camera's lookAt vector smoothly
    const lookAtProxy = { x: 0, y: 0, z: 0 };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".specs-section",
            start: "top bottom", // Starts when top of specs section hits bottom of screen
            end: "top top",      // Ends when specs section locks to top of screen
            scrub: 1,            // 1 second smoothing on the scroll tie
        }
    });

    // Action A: Open the Door (120 degrees converted to radians)
    if (doorAssembly) {
        tl.to(doorAssembly.rotation, {
            y: doorAssembly.rotation.y + (120 * Math.PI) / 180,
            ease: "power1.inOut"
        }, 0); // '0' ensures it starts at the exact beginning of the timeline
    }

    // Action B: Move Camera Position
    tl.to(camera.position, {
        x: 0,
        y: 0.5,
        z: 2.5, // Pushes tight into the enclosure
        ease: "power1.inOut",
        onUpdate: () => {
            camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z);
        }
    }, 0);

    // Simultaneously tween the LookAt Proxy towards the Extruder Head
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
    
    // Explicitly update camera lookAt in the render loop if not animating
    // so it starts centered before the scroll begins
    if (!gsap.isTweening(camera.position)) {
         camera.lookAt(0, 0, 0); 
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);