const container = document.getElementById('model-container');
if (!container) {
    console.error('Model container not found');
    throw new Error('Model container not found');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Fallback cube if model fails to load
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
let modelObject = cube; // Default to cube
scene.add(cube);

const loader = new THREE.FBXLoader();
loader.load(
    'gun.fbx',
    (object) => {
        console.log('FBX model loaded successfully:', object);
        
        // Replace PSD textures with PNG
        object.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.material.map && child.material.map.name && child.material.map.name.includes('.psd')) {
                    console.log('Replacing PSD texture:', child.material.map.name);
                    const textureLoader = new THREE.TextureLoader();
                    const newTexture = textureLoader.load(
                        'Textures/PolygonWar_Texture_GoodVersion.png',
                        () => console.log('New texture loaded:', 'Textures/PolygonWar_Texture_GoodVersion.png'),
                        undefined,
                        (error) => console.error('Error loading new texture:', error)
                    );
                    child.material.map = newTexture;
                    child.material.needsUpdate = true;
                }
            }
        });

        // Center and scale model
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        object.scale.set(scale, scale, scale);
        
        // Replace cube with model
        scene.remove(cube);
        scene.add(object);
        modelObject = object;
        
        // Hide fallback message
        document.getElementById('model-fallback').style.display = 'none';
    },
    (progress) => {
        console.log(`Loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
    },
    (error) => {
        console.error('Error loading FBX model:', error);
        document.getElementById('model-fallback').style.display = 'block';
    }
);

function animate() {
    requestAnimationFrame(animate);
    modelObject.rotation.y += 0.01; // Slow rotation
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});