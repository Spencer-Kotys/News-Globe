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
const material = new THREE.MeshPhongMaterial({
  map: loader.load('/earth_color.jpg'),      // Base color of Earth
  normalMap: loader.load('/earth_normal.jpg'),    // Adds texture depth
  normalScale: new THREE.Vector2(0.5, 0.5), // Adjust normal map intensity
  specularMap: loader.load('/earth_spec.jpg'),  // Controls shininess
  specular: new THREE.Color('grey'),
  shininess: 50, // Controls reflectivness
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

// 5. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.0001; // Slow spin
  controls.update();
  renderer.render(scene, camera);
}
animate();