import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Constants for Earth rendering
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });

// Country coordinates for placing markers
let locationData = {};

async function loadLocationData() {
  const response = await fetch('/locations.json');
  locationData = await response.json();
  updateRSSFeed();
}

loadLocationData();

// RSS feeds
const rssFeeds = [
    'https://rss.app/feeds/mKpvOxHGzgNpP5Ib.xml', // Google News, World News
    'https://rss.app/feeds/xsP4Lat7ZnqG58Vp.xml', // Google News, US News
    'https://rss.app/feeds/dcFCoFLUF4HsslSJ.xml', // Google News, Science
];

// RSS speed control
let scrollX = window.innerWidth; // Start off-screen to the right
const scrollSpeed = 1.5; // Constant pixels per frame
const rssContent = document.getElementById('rss-content');

// Camera and Renderer Setup
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 3;

// 1. The Loader
const loader = new THREE.TextureLoader();

// 2. The Earth Mesh
const dayTexture = loader.load('/earth_color.jpg');
const nightTexture = loader.load('/earth_night.jpg');
const normalMap = loader.load('/earth_normal.jpg');
const specMap = loader.load('/earth_spec.jpg');
const geometry = new THREE.SphereGeometry(1, 64, 64);
const earthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    sunDirection: { value: new THREE.Vector3() },
    dayTexture: { value: dayTexture },
    nightTexture: { value: nightTexture },
    normalMap: { value: normalMap },
    specularMap: { value: specMap }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
      
      // Calculate position relative to the camera for reflections
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vViewPosition = cameraPosition - worldPosition.xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D specularMap;
    uniform vec3 sunDirection;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // Normalize the sun direction
      vec3 L = normalize(sunDirection);
      vec3 V = normalize(vViewPosition);
      vec3 N = normalize(vNormal);

      // 1. Base Textures
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);
      float specValue = texture2D(specularMap, vUv).r; // Read the specular map (r channel)

      // 2. Diffuse Lighting (Day/Night transition)
      float intensity = dot(N, L);
      float mixAmount = smoothstep(-0.05, 0.05, intensity);

      // 3. Specular Reflection (The "Glint" on the water)
      // We only want reflections on the "day" side where the specMap is bright (water)
      vec3 R = reflect(-L, N);
      float specStrength = pow(max(dot(R, V), 0.0), 32.0) * specValue * mixAmount;
      vec3 specularReflection = vec3(1.0) * specStrength;

      // 4. Combine everything
      vec3 baseColor = mix(nightColor.rgb, dayColor.rgb, mixAmount);
      gl_FragColor = vec4(baseColor + specularReflection, 1.0);
    }
  `
});

const earth = new THREE.Mesh(geometry, earthMaterial);
earth.rotation.z = 23.4 * (Math.PI / 180);
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
controls.autoRotateSpeed = 0.2; // Adjust rotation speed

// 5. Time Display
const timeElement = document.getElementById('time-display');
function updateClock() {
    const now = new Date();
    
    // Format the date
    const dateString = now.getUTCDate() + " " + now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) + " " + now.getUTCFullYear();
    
    // Format the UTC 24-hour time
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    timeElement.textContent = `${hours}:${minutes}:${seconds} ${dateString} UTC`;
}

// 6. Convert Lat/Lon to 3D Vector
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

const markers = []; // Store markers for raycasting (clicking)

// 7. Add a marker for a news story
function addMarker(lat, lon, newsTitle, newsUrl) {
    const markerGeo = new THREE.SphereGeometry(0.02, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeo, markerMat);

    // Position the marker slightly above the surface (radius 1.01)
    const position = latLonToVector3(lat, lon, 1.01);
    marker.position.copy(position);

    // Store the news data directly on the mesh object
    marker.userData = { title: newsTitle, url: newsUrl };

    earth.add(marker); // Add to earth so it rotates with it
    markers.push(marker);
}

// 8. Raycaster for detecting clicks on markers
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    // 1. Convert mouse position to "Normalized Device Coordinates" (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 2. Point the raycaster at the mouse
    raycaster.setFromCamera(mouse, camera);

    // 3. Check if we hit any markers
    const intersects = raycaster.intersectObjects(markers);

    if (intersects.length > 0) {
        const clickedMarker = intersects[0].object;
        alert(`Breaking News: ${clickedMarker.userData.title}`);
        window.open(clickedMarker.userData.url, '_blank'); // Open news story
    }
});

// 9. Clear Globe Markers
function clearMarkers() {
    markers.forEach(marker => {
        earth.remove(marker); // Remove from the 3D scene
        marker.geometry.dispose(); // Free up memory
        marker.material.dispose();
    });
    markers.length = 0; // Clear the array
}

// 10. Fetch and Update RSS Feed
async function updateRSSFeed() {
    clearMarkers(); // Clear existing markers before adding new ones
    let allItems = [];

    // Map each URL to a fetch promise
    const fetchPromises = rssFeeds.map(url => {
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
        return fetch(proxyUrl).then(res => res.json());
    });

    try {
        const results = await Promise.all(fetchPromises);
        
        results.forEach(data => {
            if (data.status === 'ok') {
                allItems = allItems.concat(data.items);
            }
        });
        
        // 1. Update the Scrolling Ticker
        const headlines = allItems.map(item => `*** ${item.title} ***`).join('      ');
        document.getElementById('rss-content').textContent = headlines;

        // 2. Add Markers to the Globe
        const seenTitles = new Set(); // To avoid duplicate markers for the same news story
        allItems.forEach(item => {
          if (seenTitles.has(item.title)) return; // Skip if we've already added a marker for this title
          seenTitles.add(item.title);
            for (const place in locationData) {
                if (item.title.includes(place)) {
                  const coords = locationData[place];
                  addMarker(coords.lat, coords.lon, item.title, item.link);
                  break; // Stop checking other places once we find a match
                }
            }
        });
    } catch (error) {
        console.error('Error fetching RSS:', error);
        document.getElementById('rss-content').textContent = "Unable to load news feed.";
    }
}

// Refresh the news every 10 minutes
setInterval(updateRSSFeed, 600000);

// 11. Marquee Scrolling
function updateMarquee() {
    scrollX -= scrollSpeed;

    // Check if the text has scrolled entirely off the left side
    // rssContent.offsetWidth gives us the actual width of the long text string
    if (scrollX < -rssContent.offsetWidth) {
        scrollX = window.innerWidth; // Reset to the right side
    }

    rssContent.style.transform = `translateX(${scrollX}px)`;
}

// 12. Handle Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 13. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  updateSunPosition(sunLight); // Update sun position every frame
  updateClock(); // Update the clock every frame
  earthMaterial.uniforms.sunDirection.value.copy(sunLight.position).normalize();
  const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
  markers.forEach(m => m.scale.set(scale, scale, scale));
  updateMarquee(); // Update the marquee position every frame
  controls.update();
  renderer.render(scene, camera);
}
animate();
