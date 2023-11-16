import * as THREE from 'three';
import { Vector3, Euler, AnimationMixer, Color } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

class ModelManager {
	constructor(models = {}) {
		this.models = {};
		this.modelsPath = './models';
		this.defaultModelScaleConversion = 10;
		this.setup(models);
	}

	getModelKeys() {
		return Object.keys(this.models);
	}

	getModel(key) {
		const model = this.models[key];
		// if (!model) throw new Error(`Could not find model ${key}`);
		return model;
	}

	setup(modelsData = {}) {
		this.models = JSON.parse(JSON.stringify(modelsData));
		const modelKeys = this.getModelKeys();
		modelKeys.forEach((modelKey) => {
			const model = this.models[modelKey];
			model.key = modelKey;
			let { scale } = model;
			if (!scale) scale = this.defaultModelScaleConversion;
			scale = (typeof scale === 'number') ? [scale, scale, scale] : [...scale];
			model.scale = (new Vector3()).fromArray(scale);
			if (!model.format) {
				const pathComponents = model.path.split('.');
				model.format = pathComponents[pathComponents.length - 1].toLowerCase();
			}
			if (model.color) {
				if (typeof model.color === 'string') {
					model.color = new Color(model.color);
				} else {
					const [r, g, b] = model.color;
					model.color = new Color(r, g, b);
				}
			}
		});
	}

	static loadGlft(fullFilePath, onProgress) {
		const loader = new GLTFLoader();
		return new Promise((resolve, reject) => {
			// Load passes a gltf object to `resolve`
			loader.load(fullFilePath, resolve, onProgress, reject);
		});
	}

	static loadFbx(fullFilePath, onProgress) {
		const loader = new FBXLoader();
		return new Promise((resolve, reject) => {
			// Load passes an fbx object to `resolve`
			loader.load(fullFilePath, resolve, onProgress, reject);
		});
	}

	loadGlft(filePath, onProgress) {
		const path = `${this.modelsPath}/${filePath}`;
		return ModelManager.loadGlft(path, onProgress);
	}

	loadFbx(filePath, onProgress) {
		const path = `${this.modelsPath}/${filePath}`;
		return ModelManager.loadFbx(path, onProgress);
	}

	async loadAll() {
		const modelKeys = Object.keys(this.models);
		const loadPromises = modelKeys
			.map((modelKey) => {
				const model = this.models[modelKey];
				const { path, format } = model;
				if (format === 'glft' || format === 'glb') {
					return this.loadGlft(path);
				}
				if (format === 'fbx') {
					return this.loadFbx(path);
				}
				console.warn('Format', format, 'is not supported');
				return null;
			});
		const results = await Promise.allSettled(loadPromises);
		return results;
	}

	async loadModels() {
		const modelKeys = this.getModelKeys();
		const results = await this.loadAll();
		results.forEach((promiseResult, i) => {
			const { value } = promiseResult;
			const key = modelKeys[i];
			const model = this.models[key];
			if (model.format === 'glft' || model.format === 'glb') {
				model.gltf = value;
				model.animations = value.animations;
				model.object = value.scene;
			} else if (model.format === 'fbx') {
				model.fbx = value;
				model.object = value;
				model.animations = value.animations;
			} else {
				throw new Error(`Unsupported format ${model.format}`);
			}
			console.log('\tLoaded', key);
			model.object.name = key;
			model.object.scale.copy(model.scale);
			// model.object.rotation.fromArray([0, 0, 0], 'XYZ');
			model.object.up.copy(new Vector3(0, 1, 0));
			// model.object.lookAt(new Vector3(0, 0, 0));
			model.object.traverse((c) => { c.castShadow = true; });
			// Save a base rotation to the model object itself because there's no good place
			// to save this on the Three Object that won't be lost when the object is cloned.
			model.baseRotation = new Euler(Math.PI / 2, Math.PI / 2, 0, 'ZXY');

			if (model.color || typeof model.castShadow === 'boolean') {
				model.object.traverse((child) => {
					if (!child.isMesh) return;
					if (model.color) {
						this.updateMaterial(child, model.color);
					}
					if (typeof model.castShadow === 'boolean') {
						child.castShadow = model.castShadow;
					}
				});
			}
			// model.object.traverse((obj) => {
			// 	if (!obj.isMesh) return;
			// 	obj.material = new THREE.MeshDepthMaterial({
			// 		fog: true,
			// 		wireframe: true,
			// 	});
			// });
		});
		// const dino = this.makeNewObject('tRex', [400, 100, 80]);
		// window.d = dino;
		// window.g.gameScene.worldGroup.add(dino);
		// this.playClip(dino, 0);
		return modelKeys.map((modelKey) => this.models[modelKey]);
	}

	updateMaterial(obj, color) {
		obj.material = new THREE.MeshStandardMaterial({
			color,
		});
		obj.needsUpdate = true;
	}

	makeNewObject(modelKey, positionArray) {
		const model = this.getModel(modelKey);
		const obj = clone(model.object);
		obj.userData.modelKey = modelKey;
		if (positionArray) obj.position.fromArray(positionArray);
		return obj;
	}

	getBaseRotation(modelKey) {
		return this.models[modelKey].baseRotation;
	}

	playClip(obj, animationNameOrIndex = 0) {
		const { modelKey } = obj.userData;
		const model = this.getModel(modelKey);
		if (!model) return null;
		if (!model.animations) {
			// console.warn('No animations found for model', modelKey, obj.uuid);
			return null;
		}
		const mixer = new AnimationMixer(obj);
		let index = 0;
		if (typeof animationNameOrIndex === 'number') {
			index = animationNameOrIndex;
		} else if (typeof animationNameOrIndex === 'string') {
			index = model.animationIndices[animationNameOrIndex] || 0;
		}
		const clip = model.animations[index];
		if (!clip) return null;
		const action = mixer.clipAction(clip);
		action.play();
		return mixer;
	}
}

export default ModelManager;
