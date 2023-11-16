/* eslint-disable class-methods-use-this */

import * as THREE from 'three';
import { Vector3, Group, Scene, PerspectiveCamera } from 'three';
// import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { TAU, HALF_PI, clamp } from 'rocket-boots';
import Renderer from 'rocket-boots-three-toolbox/src/Renderer.js';
import ModelManager from './triludo/ModelManager.js';

// import noise from 'noise-esm';

window.THREE = THREE;

class DinoScene {
	constructor(options = {}) {
		// Settings
		this.gridConversion = [1, 1, -1];
		this.coordsConversion = [1, 1, 1];
		this.gridSquareSize = 20;
		this.clearColor = '#fff';
		this.fogColor = null; // DinoScene.makeColor('#555'); // leave blank to use option's fogColor or clearColor
		this.sunLightAngle = Math.PI;
		this.sunLightDistance = 10000; // Not sure this matters?
		this.sunLightMaxIntensity = 0.5;
		this.sunLightBaseIntensity = 0.3;
		this.fov = 75;
		this.eyeLightColor = 0xffffff;
		this.eyeLightIntensity = 0.9;
		this.eyeLightDistance = 100;
		this.chunkSize = 128; // In grid units
		this.terrainSegments = 256;
		this.baseTerrainColor = 0x101010;  // dino: 0x55ffbb,
		// Instantiated things
		this.sunLight = null;
		this.eyeLight = null;
		this.scene = null;
		this.renderer = null;
		this.autoFacingObjects = [];
		this.camera = null;
		// Scene hierarchy: Scene --> world group --> terrain and entity groups --> everything else
		this.worldGroup = null;
		this.terrainGroup = null;
		this.entityGroup = null;
		this.entitySceneObjects = {}; // keyed by the entity's unique entityId
		this.chunkTerrains = [];
		this.modelMgr = new ModelManager(options.models);
		this.fogNear = 3000;
		this.fogFar = 6000;
	}

	registerSceneObj(entityId, obj) {
		this.entitySceneObjects[entityId] = obj;
	}

	deregisterSceneObj(entityId) {
		delete this.entitySceneObjects[entityId];
	}

	findRegisteredSceneObj(entityId) {
		return this.entitySceneObjects[entityId];
	}

	findRegisteredSceneObjEntityId(uuid) {
		const foundEntityId = Object.keys(this.entitySceneObjects).find((entityId) => {
			const obj = this.entitySceneObjects[entityId];
			return (obj.uuid === uuid);
		});
		return foundEntityId;
	}

	static convertCoordsToVector3(coords, m = 1) {
		const [x = 0, y = 0, z = 0] = coords;
		return new Vector3(x * m, y * m, z * m);
	}

	convertCoordsToVector3(coords) {
		const [x = 0, y = 0, z = 0] = coords;
		const [convX, convY, convZ] = this.coordsConversion;
		return new Vector3(x * convX, y * convY, z * convZ);
	}

	makeCamera([x = 0, y = 0, z = 0] = []) {
		const aspect = window.innerWidth / window.innerHeight;
		const camera = new PerspectiveCamera(this.fov, aspect, 0.1, 100000);
		camera.position.x = x;
		camera.position.y = y;
		camera.position.z = z;
		return camera;
	}

	setDirLight(x = 0, y = 0, z = 0) {
		if (!this.dirLight) this.addNewDirLight();
		this.dirLight.position.set(x, y, z);
	}

	addNewDirLight(color = 0xffffff, intensity = 0.5) {
		this.dirLight = new THREE.DirectionalLight(color, intensity);
		this.scene.add(this.dirLight);
	}

	getSunLightIntensity() {
		const intensityDelta = this.sunLightMaxIntensity - this.sunLightBaseIntensity;
		const intensity = this.sunLightBaseIntensity + (
			Math.sin(this.sunLightAngle + HALF_PI) * intensityDelta
		);
		return clamp(intensity, 0, 1);
	}

	setDirLightByAngle(angle) {
		if (!this.dirLight) this.addNewDirLight();
		this.sunLightAngle = angle % TAU;
		this.dirLight.position.setFromCylindricalCoords(this.sunLightDistance, this.sunLightAngle, 0);
		this.dirLight.intensity = this.getSunLightIntensity();
	}

	makeLight() {
		this.setDirLight(0, -1, 6);

		// const { eyeLightColor, eyeLightIntensity, eyeLightDistance } = this;
		// this.eyeLight = new THREE.PointLight(eyeLightColor, eyeLightIntensity, eyeLightDistance);
		// this.scene.add(this.eyeLight);

		const pointLight = new THREE.PointLight(0xffffff, 0.25, 1000);
		pointLight.position.set(0, 0, 100);
		// pointLight.lookAt(new Vector3());
		this.scene.add(pointLight);

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
		this.scene.add(ambientLight);

		// const sphereSize = 1;
		// const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
		// this.scene.add(pointLightHelper);
	}

	setupRenderer() {
		this.renderer = new Renderer();
		this.renderer.setClearColor(this.clearColor);
	}

	async setup(cameraCoords) {
		if (!this.renderer) this.setupRenderer();
		this.scene = new Scene();
		this.worldGroup = new Group();
		this.terrainGroup = new Group();
		this.entityGroup = new Group();
		this.worldGroup.add(this.terrainGroup);
		this.worldGroup.add(this.entityGroup);
		this.scene.add(this.worldGroup);
		this.scene.fog = new THREE.Fog(0xcccccc, this.fogNear, this.fogFar);
		this.camera = this.makeCamera(cameraCoords);
		this.camera.lookAt(new Vector3(0, 0, 0));
		this.makeLight();
		this.entitySceneObjects = {};
		// const axesHelper = new THREE.AxesHelper(5);
		// this.scene.add(axesHelper);
		await this.modelMgr.loadModels();
		return this;
	}

	// updateToGoals(t) {
	// const q = 1.0 - (0.24 ** t); // This q & lerp logic is from simondev
	// To lerp:
	// obj.position.lerp(goalPos, q);
	// To do it instantly:
	// obj.position.copy(goalPos);

	// this.camera.rotation.setFromVector3(this.worldRotationGoal);
	// }

	updateCamera(positionGoal, rotationGoal /* , focusGoal = new Vector3() */) {
		if (positionGoal) {
			this.camera.position.copy(DinoScene.convertCoordsToVector3(positionGoal));
		}
		this.camera.rotation.setFromVector3(rotationGoal, 'ZXY');
		// this.camera.lookAt(focusGoal);
	}

	removeObject(obj) {
		const { uuid } = obj;
		const entityId = this.findRegisteredSceneObjEntityId(uuid);
		this.deregisterSceneObj(entityId);
		obj.removeFromParent();
		obj.traverse((child) => {
			if (child.geometry) child.geometry.dispose();
			if (child.material) child.material.dispose();
			// TODO: Also dispose of textures
		});
		console.log('removing object', entityId, uuid);
	}

	removeNotVisible(group, visibleUuids) {
		group.children.forEach((child) => {
			if (!visibleUuids.includes(child.uuid)) {
				this.removeObject(child);
			}
		});
	}

	static makeColor(colorParam) {
		return (colorParam instanceof Array)
			? new THREE.Color(...colorParam) : new THREE.Color(colorParam);
	}

	animateObject(t, sceneObj, animationName) {
		// TODO: Find a better home for this. not great to put this onto the object itself
		if (typeof sceneObj.mixer === 'undefined') {
			sceneObj.mixer = this.modelMgr.playClip(sceneObj, animationName);
		} else if (sceneObj.mixer === null) {
			// Do nothing
		} else { // We have a mixer
			if (animationName === sceneObj.lastAnimationName) {
				sceneObj.mixer.update(t / 1000);
				return;
			}
			// Animation names don't match, so start new mixer
			sceneObj.mixer = this.modelMgr.playClip(sceneObj, animationName);
			sceneObj.lastAnimationName = animationName;
		}
	}

	update(options = {}, t = 5) { // time `t` is in milliseconds
		// console.log(t);
		const {
			cameraPosition,
			cameraRotationGoalArray,
			worldCoords,
			entities,
			terrainChunks,
			skyColor,
			fogColor,
			sunLightAngle,
		} = options;
		// Set sky and sunlight
		if (skyColor && skyColor !== this.clearColor) {
			this.clearColor = DinoScene.makeColor(skyColor);
			this.renderer.setClearColor(this.clearColor);
			this.scene.fog.color = DinoScene.makeColor(fogColor || this.fogColor || skyColor);
		}
		if (typeof sunLightAngle === 'number' && sunLightAngle !== this.sunLightAngle) {
			this.setDirLightByAngle(sunLightAngle);
		}
		// Set camera position
		if (cameraPosition || cameraRotationGoalArray) {
			const [x = 0, y = 0, z = 0] = cameraRotationGoalArray;
			this.updateCamera(
				DinoScene.convertCoordsToVector3(cameraPosition),
				(new Vector3(x, y, z)),
			);
			// this.camera.position.copy(DinoScene.convertCoordsToVector3(cameraPosition));
			// this.camera.lookAt(new Vector3());
		}
		if (worldCoords) {
			this.worldGroup.position.copy(DinoScene.convertCoordsToVector3(worldCoords));
		}
		if (entities) {
			const visibleEntityUuids = []; // "visible" as in "included in the update"
			entities.forEach((entity) => {
				let sceneObj = this.entitySceneObjects[entity.entityId];
				if (sceneObj) {
					const pos = DinoScene.convertCoordsToVector3(entity.coords);
					sceneObj.position.copy(pos);
					// sceneObj.setRotationFromAxisAngle(sceneObj.up, 0);
					// sceneObj.rotateOnAxis(sceneObj.up, Math.PI); // -entity.facing);
					// Look up the model's base rotation and use that as the basis
					// There HAS GOT TO BE A BETTER WAY TO DO THIS
					if (entity.renderAs === 'model') {
						const baseRotation = this.modelMgr.getBaseRotation(entity.model);
						sceneObj.rotation.set(
							baseRotation.x,
							baseRotation.y + entity.facing,
							baseRotation.z,
							baseRotation.order,
						);
						// sceneObj.rotation.set(
						// 	window.gx || 0,
						// 	window.gy || 0,
						// 	window.gz || 0,
						// 	window.order || 'YXZ',
						// );
						// if (entity.isDinosaur) console.log(JSON.stringify(sceneObj.rotation));
					} else {
						// sceneObj.rotation.setX(entity.facing);
					}
					// if (entity.lookAt) {
					// 	const look = sceneObj.localToWorld(DinoScene.convertCoordsToVector3(entity.lookAt));
					// 	sceneObj.lookAt(look);
					// }
				} else {
					sceneObj = this.addNewWorldEntity(entity);
					if (!sceneObj) console.warn('Could not add entity to scene', entity);
				}
				visibleEntityUuids.push(sceneObj.uuid);
				// Do animation
				this.animateObject(t, sceneObj, entity.animationName);
			});
			// Loop over all world objects and remove any not visible
			this.removeNotVisible(this.entityGroup, visibleEntityUuids);
		}
		if (terrainChunks) {
			const visibleTerrainUuids = []; // "visible" as in "included in the update"
			terrainChunks.forEach((chunk) => {
				let sceneObj = this.entitySceneObjects[chunk.entityId];
				if (sceneObj) {
					// this.applyTextureImageToObject(sceneObj, chunk.textureImage);
				} else {
					console.log('Adding terrain for chunk', chunk.entityId);
					sceneObj = this.addNewTerrainChunkPlane(chunk);
				}
				visibleTerrainUuids.push(sceneObj.uuid);
			});
			// Loop over terrain objects (children of terrainGroup)
			// and remove any not visible
			this.removeNotVisible(this.terrainGroup, visibleTerrainUuids);
		}
		// this.updateToGoals(t);
		return this;
	}

	render() {
		this.autoFacingObjects.forEach((obj) => {
			obj.quaternion.copy(this.camera.quaternion);
		});
		this.renderer.render(this.scene, this.camera);
		return this;
	}

	static loadTexture(src) {
		const loader = new THREE.TextureLoader().setPath('images/');
		return new Promise((resolve, reject) => {
			loader.load(src, resolve, null, reject);
		});
	}

	makeBox() {
		const box = new THREE.BoxGeometry(10, 20, 10);
		const material = new THREE.MeshToonMaterial({
			color: 0xff0000, // flatShading: true
		});
		const boxMesh = new THREE.Mesh(box, material);
		return boxMesh;
	}

	// async addNewTerrainByHeightMap(heightMapImageSrc) {
	// 	const heightMap = await DinoScene.loadTexture(heightMapImageSrc);
	// 	const terrain = this.makeTerrain(heightMap);
	// 	window.terrain = terrain;
	// 	this.chunkTerrains.push(terrain);
	// 	this.worldGroup.add(terrain); // add the terrain to the scene
	// }

	applyTextureImageToObject(obj, textureImage) {
		if (!textureImage.complete) {
			console.warn('Cannot apply texture because image is not complete yet');
		}
		// FIXME: short-cutting this because it's not working
		return;
		const texture = new THREE.Texture(textureImage);
		texture.type = THREE.RGBAFormat;
		texture.needsUpdate = true;
		// console.log(texture, textureImage);
		// new THREE.Texture(terrainChunk.image, {}, THREE.ClampToEdgeWrapping,
		// THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter,
		// THREE.RGBAFormat, THREE.UnsignedByteType, 0);
		const { material } = obj;
		material.map = texture;
		material.needsUpdate = true;
	}

	applyHeightsToGeometry(geometry, heights /* , dataSize */) {
		const { position } = geometry.attributes;
		// const vertices = position.array;
		const heightMultiplier = 1;
		// console.log(vertices.length, position.count, 'dataSize',
		// dataSize, 'dataSize^2', dataSize * dataSize, 'height length', heights.length, heights);
		const heightsSize = heights.length;
		// for (let i = 0, j = 0, l = vertices.length; i < l; i += 1, j += 3) {
		for (let i = 0; i < position.count; i += 1) {
			// h = (Math.random() * 100));
			const y = Math.floor(i / heightsSize);
			const x = i % heightsSize;
			// const x = position.getX(i);
			// const y = position.getY(i);
			// const x = position.getX(i);
			// const y = position.getY(i);
			if (!heights[y]) {
				console.warn('No heights[y]', i, x, y, 'heightsSize', heightsSize);
				continue;
			}
			const h = heights[y][x] * heightMultiplier;
			// console.log(x, y, h);
			position.setZ(i, h);
			// {
			// 	const x = position.getX(i);
			// 	const y = position.getY(i);
			// 	position.setXYZ(i, x, y, h);
			// }
			// vertices[j + 1] = h;
		}
		position.needsUpdate = true;
	}

	makeTerrainChunkPlane(terrainChunk = {}) {
		// const texture = new THREE.TextureLoader().load('images/test-grid.jpg');
		const {
			heights, segments, size, vertexDataSize, center,
			textureData,
			textureWidth = 256,
			textureHeight = 256,
			color = this.baseTerrainColor,
		} = terrainChunk;
		// const segments = 8;
		// console.log(segments);
		const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

		// Option 1 -- a heightmap -- but it appears to be blank

		// const heightMap = new THREE.Texture(terrainChunk.image, {},
		// THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
		// THREE.NearestFilter, THREE.NearestFilter, THREE.RGBAFormat, THREE.UnsignedByteType, 0);
		// heightMap.needsUpdate = true;
		// console.log(terrainChunk.image.complete);

		// other attempts:
		// const heightMap = new THREE.Texture(terrainChunk.image);
		// heightMap.image = terrainChunk.image;
		// heightMap.type = THREE.RGBAFormat;
		// heightMap.format = THREE.UnsignedByteType;

		// Option 2 -- This has not worked

		this.applyHeightsToGeometry(geometry, heights, vertexDataSize);

		// Not sure if this is needed:
		// heightMap.wrapS = THREE.RepeatWrapping;
		// heightMap.wrapT = THREE.RepeatWrapping;

		const texture = new THREE.DataTexture(
			textureData, textureWidth, textureHeight, THREE.RGBAFormat,
		);
		texture.needsUpdate = true;

		// const material = new THREE.MeshBasicMaterial({
		const material = new THREE.MeshStandardMaterial({
		// const material = new THREE.MeshPhongMaterial({ // better performance
			// opacity: 0.9,
			color,
			map: texture, // texture
			// vertexColors: true,
			// wireframe: true,
			side: THREE.DoubleSide,
			// Option 1
			// displacementMap: heightMap,
			// displacementScale: 500,
			flatShading: true,
			// receiveShadow: true,
		});

		// create the mesh for the terrain
		const terrain = new THREE.Mesh(geometry, material);
		terrain.receiveShadow = true;
		terrain.castShadow = true;

		{
			const [x = 0, y = 0, z = 0] = center;
			terrain.position.x = x;
			terrain.position.y = y;
			terrain.position.z = z;
		}

		// rotate the terrain to make it look like hills and valleys
		// terrain.rotation.x = -Math.PI / 2;
		return terrain;
	}

	addNewTerrainChunkPlane(terrainChunk) {
		const terrain = this.makeTerrainChunkPlane(terrainChunk);
		this.chunkTerrains.push(terrain);
		this.terrainGroup.add(terrain); // add the terrain to the scene
		terrain.receiveShadow = true;
		this.entitySceneObjects[terrainChunk.entityId] = terrain;
		// const wireframe = new THREE.WireframeGeometry(terrain.geometry);
		// const line = new THREE.LineSegments(wireframe);
		// line.material.color.setHex(0xFF0000);
		// this.terrainGroup.add(line);

		return terrain;
	}

	makeEntityMaterial(entity, color, texture) {
		const materialOptions = {};
		if (color) materialOptions.color = color;
		if (entity.texture) materialOptions.map = texture;
		const material = new THREE.MeshStandardMaterial(materialOptions);
		return material;
	}

	addNewWorldEntity(entity) {
		if (!entity.renderAs) return null;
		const { renderAs, size } = entity;
		// let texture; // get from entity.texture
		let sceneObj; // mesh, plane, sprite, etc.
		let color = (entity.color) ? DinoScene.makeColor(entity.color) : null;
		if (renderAs === 'box') {
			const geometry = new THREE.BoxGeometry(size, size, size);
			const material = this.makeEntityMaterial(entity, color);
			sceneObj = new THREE.Mesh(geometry, material);
		} else if (renderAs === 'sphere') {
			const geometry = new THREE.SphereGeometry(size, 16, 8);
			const material = this.makeEntityMaterial(entity, color);
			sceneObj = new THREE.Mesh(geometry, material);
		} else if (renderAs === 'model') {
			// console.log(model.object.userData);
			// sceneObj = model.object.clone();
			sceneObj = this.modelMgr.makeNewObject(entity.model);
			sceneObj.userData.modelName = entity.model;
			// this.modelMgr.playClip(sceneObj, 0);
			// console.log(sceneObj.userData);
		}
		// sceneObj.castShadow = true;
		// TODO: renderAs other types

		sceneObj.position.copy(this.convertCoordsToVector3(entity.coords));
		this.entityGroup.add(sceneObj);
		this.entitySceneObjects[entity.entityId] = sceneObj;
		return sceneObj;
	}
}

export default DinoScene;
