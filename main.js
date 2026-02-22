import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Standard Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 3;

// 1. The Loader
const loader = new THREE.TextureLoader();

// 2. The Earth Mesh
const geometry = new THREE.SphereGeometry(1, 64, 64); // High detail segments
const material = new THREE.MeshStandardMaterial({
  map: loader.load('/earth_color.jpg'),      // Path to your image in /public
  bumpMap: loader.load('/earth_bump.jpg'),    // Adds texture depth
  bumpScale: 0.05,
});

const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// 3. Add Lights (Crucial for Earth)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Soft overall light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(5, 3, 5); // Light from the side
scene.add(sunLight);

// 4. Interaction (OrbitControls)
const controls = new OrbitControls(camera, renderer.domElement);

// 5. Add Clouds (Extra Layer)
const cloudGeometry = new THREE.SphereGeometry(1.02, 64, 64); // Slightly larger
const cloudMaterial = new THREE.MeshStandardMaterial({
  map: loader.load('/earth_clouds.jpg'),
  transparent: true,
  opacity: 0.4
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
scene.add(clouds);

// 6. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.002; // Slow spin
  clouds.rotation.y += 0.003; // Clouds move faster than the ground
  controls.update();
  renderer.render(scene, camera);
}
animate();