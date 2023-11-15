import * as THREE from 'three';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import ModelManager from './ModelManager.js';
import models from './models.js';

function setupScene() {
	const scene = new THREE.Scene();
	// Create a new camera and position it
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.set(0, 100, 500);
	// Create a directional light and add it to the scene
	const directionalLight = new THREE.DirectionalLight(0xffffff, 8);
	directionalLight.position.set(100, 100, 100);
	scene.add(directionalLight);
	const ambientLight = new THREE.AmbientLight(0x404040, 0.75);
	scene.add(ambientLight);

	// Create a new renderer and add it to the page
	const renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
	return { scene, camera, renderer };
}

// eslint-disable-next-line
async function loadGLBModel(scene, url) {
	// Create a new instance of the GLTFLoader
	// const loader = new GLTFLoader();

	// // Load the GLB file and its associated resources
	// loader.load(
	// 	url,
	// 	(gltf) => {
	// 		// The GLB file has finished loading
	// 		const model = gltf.scene;

	// 		// Add the model to the scene
	// 		// scene.add(model);

	// 		// Render the scene
	// 		renderer.render(scene, camera);
	// 	},
	// 	(xhr) => {
	// 		// Progress callback (optional)
	// 		console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
	// 	},
	// 	(error) => {
	// 		// Error callback
	// 		console.error('An error happened', error);
	// 	},
	// );
	const gltf = await ModelManager.loadGlft(url);
	const model = gltf.scene;
	scene.add(model);
	window.a = model;
	return model;
}

async function test() {
	document.getElementById('loading').style.display = 'none';
	const { scene, camera, renderer } = setupScene();
	window.render = () => renderer.render(scene, camera);
	// Test 1
	// await loadGLBModel(scene, 'models/dinos/Exported/Velo.glb');
	// Test 2
	const mm = new ModelManager(models);
	await mm.loadModels();
	const keys = mm.getModelKeys();
	const xStep = 130;
	const xStart = (keys.length * xStep) / -2;
	keys.forEach((key, i) => {
		const x = xStart + (i * xStep);
		const dino = mm.makeNewObject(key, [x, 0, 0]);
		scene.add(dino);
		window.d = dino;
	});
	window.scene = scene;
	window.mm = mm;
	window.render();

	// scene.traverse((child) => {
	// 	if (!child.isMesh) return;
	// 	// updateMaterial(child);
	// });
}

function updateMaterial(obj) {
	/* eslint-disable no-param-reassign */
	obj.material = new THREE.MeshStandardMaterial({
		color: new THREE.Color(0.5, 0.2, 0.1),
	});
	obj.needsUpdate = true;
	/* eslint-enable no-param-reassign */
	window.render();
}

window.updateMaterial = updateMaterial;

export default test;
