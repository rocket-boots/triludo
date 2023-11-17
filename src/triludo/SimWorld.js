import { ArrayCoords, Random, TAU, PI } from 'rocket-boots';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Entity from './Entity.js';
import TerrainGenerator from './TerrainGenerator.js';

const MAX_ACTORS = 5000;
const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24;
const START_WORLD_TIME = 60 * 60 * 8; // 7 AM, in seconds

/**
 * A SimWorld is some kind of "space", a time, and a collection
 * of entities that live in that space and time
 */
class SimWorld {
	constructor(options = {}) {
		const {
			ActorClass = Entity, // recommended
			ItemClass = Entity, // recommended
			TerrainGeneratorClass = TerrainGenerator, // recommended
			startWorldTime, // optional
			physics = true,
			gravity = -9.8, // meters per second squared
		} = options;
		// Classes
		this.ItemClass = ItemClass;
		this.ActorClass = ActorClass;
		this.TerrainGeneratorClass = TerrainGeneratorClass;
		// Time
		this.lastDeltaT = 0; // just for debug/tracking purposes
		// How spaced-out do you want the spawned actors
		this.spawnActorDistance = 1000;
		// Min spawn distance should be greater than the sight view of enemies so that they
		// don't spawn and instantly attack.
		// Max spawn distance should be somwhat similar to half the size of all the chunks being shown
		this.spawnRadii = [this.spawnActorDistance, 3500];
		this.despawnRadius = this.spawnRadii[1] * 1.5;
		// The object containing ALL entities
		this.allEntities = {};
		this.allEntityIds = [];
		// this.loop = new Looper();
		this.players = [];
		this.spirits = [];
		this.actors = [];
		this.items = [];
		this.tick = 0;
		this.worldTime = startWorldTime || START_WORLD_TIME; // In seconds
		this.worldTimePerGameTime = 100; // originally 200
		// Instantiate things
		this.terrainGen = new this.TerrainGeneratorClass();
		this.physicsWorld = (physics) ? new CANNON.World({
			gravity: new CANNON.Vec3(0, 0, gravity * 10), // TODO: determine based on grid units to meter conversion
		}) : null;
	}

	forEachEntity(fn, options = {}) {
		const { includeRemoved = false } = options;
		const len = this.allEntityIds.length;
		for (let i = 0; i < len; i += 1) {
			const entId = this.allEntityIds[i];
			const ent = this.allEntities[entId];
			if (!ent.remove || includeRemoved) { // Skip removed entities
				fn(ent, entId);
			}
		}
	}

	static makeEntityPhysicsShape(ent) {
		const { size } = ent;
		const shapeName = ent.physicsShape || ent.shape || 'Box';
		const shapeCaps = shapeName.toUpperCase();
		if (shapeCaps === 'BOX') {
			const { width = size, height = size, depth = size } = ent;
			const halfExtents = new CANNON.Vec3(height, width, depth); // TODO: Check that these are in the correct spot
			return new CANNON.Box(halfExtents);
		}
		if (shapeCaps === 'SPHERE') {
			const { radius = size } = ent;
			return new CANNON.Sphere(radius);
		}
		// TODO: Add other shapes as needed: ConvexyPolyhedron, Particle, Plane, Heightfield, Trimesh
		// https://pmndrs.github.io/cannon-es/docs/classes/Shape.html
		return null;
	}

	makeEntityPhysicsBody(ent) {
		const { mass, staticType } = ent;
		if (!mass && !staticType) {
			console.warn('No mass and not static. Something is wrong here.');
		}
		const shape = SimWorld.makeEntityPhysicsShape(ent);
		const body = new CANNON.Body({
			// type: CANNON.Body.STATIC,
			shape,
			mass,
		});
		this.syncPhysicsBodyToEntity(body, ent);
		this.physicsWorld.addBody(body);
	}

	syncEntityToPhysicsBody(ent, bodyParam) {
		let body = bodyParam || ent.physicsBody;
		if (!body) { // No body?
			// If no shape, then physics aren't desired for this entity, so do nothing
			if (!ent.physicsShape) return;
			body = this.makeEntityPhysicsBody(ent);
		}
		const { x, y, z } = body.position;
		ent.coords = [x, y, z];
		ent.quaternion = body.quaternion;
	}

	syncPhysicsBodyToEntity(body, ent) {
		const [x, y, z] = ent.coords;
		body.position.set(x, y, z);
		if (ent.quaternion) body.quaternion.set(ent.quaternion);
		ent.physicsBody = body;
	}

	setupPhysicalEntities() {
		this.forEachEntity((ent) => this.makeEntityPhysicsBody(ent));
	}

	setup() {
		this.setupPhysicalEntities();
		const groundBody = new CANNON.Body({
			type: CANNON.Body.STATIC,
			shape: new CANNON.Plane(),
		});
		groundBody.quaternion.setFromEuler(0, 0, 0); // (-Math.PI / 2, 0, 0);
		this.physicsWorld.addBody(groundBody);
		// TODO: Remove test code below
		/*
		const radius = 500;
		const sphereBody = new CANNON.Body({
			mass: 5,
			shape: new CANNON.Sphere(radius),
		});
		sphereBody.position.set(2000, 200, 5000);
		this.physicsWorld.addBody(sphereBody);
		*/
		if (this.debugScene) {
			this.cannonDebugger = new CannonDebugger(
				this.debugScene, this.physicsWorld, { color: 0xff0000 },
			);
		}
	}

	update(t) {
		this.tick += 1;
		if (this.tick > 1000000) this.tick = 0;
		const deltaTWorldTime = (t / 1000) * this.worldTimePerGameTime;
		this.worldTime = (this.worldTime + deltaTWorldTime) % SECONDS_PER_DAY;
		this.actors.forEach((actor) => actor.update(t, this));
		this.physicsWorld.fixedStep();
		if (this.cannonDebugger) this.cannonDebugger.update();
		this.forEachEntity((ent) => this.syncEntityToPhysicsBody(ent));
		return {};
	}

	getHour() {
		return Math.floor(this.worldTime / SECONDS_PER_HOUR);
	}

	getMinutes() {
		return Math.floor(this.worldTime / 60) % 60;
	}

	getRandomSpawnCoords(coords) {
		const [minRadius, maxRadius] = this.spawnRadii;
		const r = minRadius + Random.randomInt(maxRadius - minRadius);
		const angle = Random.randomAngle();
		const [x, y] = ArrayCoords.polarToCartesian(r, angle);
		return ArrayCoords.add(coords, [x, y, 0]);
	}

	getAllEntitiesArray() {
		// TODO: Optimize this
		const entities = this.allEntityIds.map((entId) => this.allEntities[entId]);
		return [...this.actors, ...this.items, ...entities];
	}

	addEntity(entObj = {}) {
		let { entityId } = entObj;
		if (!entityId) {
			entityId = Entity.makeEntityId();
			entObj.entityId = entityId;
		}
		if (this.allEntities[entityId]) throw new Error('Cannot add entity that already exists');
		this.allEntities[entityId] = entObj; // Note that we're not cloning
		this.allEntityIds.push(entityId);
	}

	makeCharacter(charProperties) {
		const character = new this.ActorClass(charProperties);
		character.isCharacter = true;
		return character;
	}

	addNewCharacter(charProperties) {
		const character = this.makeCharacter(charProperties);
		this.actors.push(character);
		return character;
	}

	makeActor(opt = {}) {
		return (new this.ActorClass(opt));
	}

	addNewActor(opt) {
		if (this.actors.length >= MAX_ACTORS) return null;
		const actor = this.makeActor(opt);
		this.actors.push(actor);
		return actor;
	}

	makeItem(itemData = {}) {
		const item = new this.ItemClass(itemData);
		if (item.randomAtRadius) {
			const angle = Random.randomAngle();
			const [x, y] = ArrayCoords.polarToCartesian(Number(item.randomAtRadius), angle);
			item.coords = [x, y, 0];
		}
		this.addEntity(item);
		return item;
	}

	addNewItem(itemData = {}) {
		const item = this.makeItem(itemData);
		this.items.push(item);
		return item;
	}

	setHeightToTerrain(param) {
		if (param.forEach) {
			param.forEach((entity) => this.setHeightToTerrain(entity));
			return;
		}
		const entity = param;
		const [x, y, z] = entity.coords;
		let h = this.terrainGen.getTerrainHeight(x, y);
		h += (entity.heightSizeOffset * entity.size);
		const grounded = (z <= h + 1);
		// have a small offset of h (+1) so things aren't in the air going from one tiny bump downwards
		// TODO: Find another way to determine landing from the ground for sound effects
		// if (grounded && !entity.grounded && entity.isCharacter) this.sounds.play('footsteps');
		// TODO: play 'land' sound instead if velocity downward is high
		entity.setGrounded(grounded, h);
	}

	/** Returns an array of (0) the distance to the nearest thing, and (1) the thing */
	static findNearest(arr, coords, filterFn) {
		const nearest = arr.reduce((previousValue, thing) => {
			// if there's a filter function defined, then use it to
			// skip considering certain things
			if (filterFn && !filterFn(thing)) return previousValue;
			const [nearestSoFar] = previousValue;
			const distance = ArrayCoords.getDistance(thing.coords, coords);
			return (distance < nearestSoFar) ? [distance, thing] : previousValue;
		}, [Infinity, null]);
		return nearest;
	}

	findNearestActor(coords, filterFn) {
		return SimWorld.findNearest(this.actors, coords, filterFn);
	}

	findNearestItem(coords, filterFn) {
		return SimWorld.findNearest(this.items, coords, filterFn);
	}

	/** Find all items that are interactable (not necessary within range though) */
	findNearestInteractableItem(coords) {
		return SimWorld.findNearest(this.items, coords, this.ItemClass.isItemInteractable);
	}

	/** Find all items that are interactable (not necessary within range though) */
	findNearestInRangeInteractableItem(coords) {
		const filter = (item) => this.ItemClass.isItemInRangeInteractable(item, coords);
		// TODO: this could be made more efficient since we're checking distance twice
		// (once in isItemInRangeInteractable, once in findNearest)
		return SimWorld.findNearest(this.items, coords, filter);
	}

	/** Will mutate certain things (array items) to set the `remove` property */
	removeLost(things = [], despawnCenter = [0, 0, 0]) {
		things.forEach((thing) => {
			if (thing.isCharacter || thing.important) return;
			if (typeof thing.despawnRadius !== 'number') return;
			const distance = ArrayCoords.getDistance(despawnCenter, thing.coords);
			// eslint-disable-next-line no-param-reassign
			if (distance > this.despawnRadius) thing.remove = true;
		});
	}

	despawn(despawnCenter) {
		this.removeLost(this.actors, despawnCenter);
		this.removeLost(this.items, despawnCenter);
		this.cleanItems();
		this.cleanActors();
	}

	static cleanRemoved(arr) {
		for (let i = arr.length - 1; i >= 0; i -= 1) {
			if (arr[i].remove) arr.splice(i, 1);
		}
	}

	cleanItems() {
		SimWorld.cleanRemoved(this.items);
	}

	cleanActors() {
		SimWorld.cleanRemoved(this.actors);
	}

	getSun() {
		const hr = this.getHour();
		// Angle of 0 = fully risen, 12 = fully hidden
		const sunLightAngle = (((hr / 24) * TAU) + PI) % TAU;
		// TODO: Change the color of the sun light?
		// TODO: Set min and max intensity values
		return { sunLightAngle };
	}
}

export default SimWorld;
