const container = document.getElementById('model-container');
if (!container) {
    console.error('Model container not found');
    throw new Error('Model container not found');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 10; // Ensure model is in view

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding; // Added: sRGB color encoding
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Added: ACES Filmic tone mapping
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
container.appendChild(renderer.domElement);

// Check WebGL support
if (!renderer.getContext()) {
    console.error('WebGL is not supported or disabled in this browser');
    document.getElementById('model-fallback').style.display = 'block';
    throw new Error('WebGL not supported');
}

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Fallback cube
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
let modelObject = cube; // Default to cube
scene.add(cube);

// Set up OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth rotation with inertia
controls.dampingFactor = 0.05;
controls.autoRotate = true; // Enable automatic spinning
controls.autoRotateSpeed = 1.0; // Slow spin speed
controls.enableZoom = false; // Disable zooming
controls.enablePan = false; // Disable panning

let autoRotateTimeout;

// Stop auto-rotation when user starts dragging
controls.addEventListener('start', () => {
    clearTimeout(autoRotateTimeout);
    controls.autoRotate = false;
});

// Resume auto-rotation after 5 seconds of inactivity
controls.addEventListener('end', () => {
    autoRotateTimeout = setTimeout(() => {
        controls.autoRotate = true;
    }, 5000); // 5000ms = 5 seconds
});

const loader = new THREE.GLTFLoader();
loader.load(
    'gun.glb',
    (gltf) => {
        console.log('GLTF model loaded successfully:', gltf);
        const object = gltf.scene;
        console.log('Model children:', object.children.length);
        console.log('Model position:', object.position);
        console.log('Model scale:', object.scale);

        // Log meshes and materials
        object.traverse((child) => {
            if (child.isMesh) {
                console.log('Mesh found:', child.name, 'Material:', child.material);
                if (child.material.map) {
                    console.log('Texture:', child.material.map.name, 'UUID:', child.material.map.uuid);
                } else {
                    console.log('No texture applied to material');
                }
            }
        });

        // Center and scale model
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim; // Adjusted for visibility
        object.scale.set(scale, scale, scale);
        console.log('Model bounding box size:', size);
        console.log('Applied scale:', scale);

        // Only remove cube if model has visible geometry
        let hasGeometry = false;
        object.traverse((child) => {
            if (child.isMesh && child.geometry) {
                hasGeometry = true;
            }
        });
        if (hasGeometry) {
            console.log('Model has geometry, removing fallback cube');
            scene.remove(cube);
            scene.add(object);
            modelObject = object;
            document.getElementById('model-fallback').style.display = 'none';
        } else {
            console.warn('Model has no visible geometry, keeping fallback cube');
            document.getElementById('model-fallback').style.display = 'block';
        }
    },
    (progress) => {
        console.log(`Loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
    },
    (error) => {
        console.error('Error loading GLTF model:', error);
        document.getElementById('model-fallback').style.display = 'block';
    }
);

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Update controls for manual and auto rotation
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    console.log('Resized canvas to:', width, 'x', height);
});