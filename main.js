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
earth.rotation.z = 23.4 * (Math.PI / 180); // Tilt Earth to match real axial tilt (23.4 degrees)
scene.add(earth);

// 3. Add Lights (Crucial for Earth)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Soft overall light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);

function getSunPosition() {
    const now = new Date();
    
    // 1. Calculate Day of the Year (0-365)
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // 2. Calculate Solar Declination (The Sun's Latitude)
    // The Earth tilts 23.45 degrees. This formula finds where the sun hits directly.
    const declination = 23.45 * Math.sin((Math.PI / 180) * (360 / 365) * (dayOfYear - 81));

    // 3. Calculate Solar Noon / Time Offset (The Sun's Longitude)
    // We use UTC time to ensure the Sun is over the Prime Meridian at Noon UTC.
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const longitude = (utcHours - 12) * 15; // 15 degrees per hour

    return {
        lat: declination,
        lon: -longitude // Negative because Earth rotates East to West
    };
}

function updateSunPosition(sunLight) {
    const pos = getSunPosition();
    const distance = 20; // Distance of the light from Earth center

    // Convert Lat/Lon to 3D Cartesian Coordinates (x, y, z)
    const phi = (90 - pos.lat) * (Math.PI / 180);
    const theta = (pos.lon + 180) * (Math.PI / 180);

    sunLight.position.x = -distance * Math.sin(phi) * Math.cos(theta);
    sunLight.position.y = distance * Math.cos(phi);
    sunLight.position.z = distance * Math.sin(phi) * Math.sin(theta);
}
scene.add(sunLight);

// 4. Interaction (OrbitControls)
const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true; // Automatically rotate the scene
controls.autoRotateSpeed = 0.5; // Adjust rotation speed

// 5. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  updateSunPosition(sunLight); // Update sun position every frame
  controls.update();
  renderer.render(scene, camera);
}
animate();