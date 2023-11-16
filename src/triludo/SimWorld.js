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
		this.physicsWorld = new CANNON.World({
			gravity: new CANNON.Vec3(0, 0, -90.8), // TODO: determine based on grid units to meter conversion
		});
	}

	setup() {
		// TODO: Remove test code below
		const groundBody = new CANNON.Body({
			type: CANNON.Body.STATIC,
			shape: new CANNON.Plane(),
		});
		groundBody.quaternion.setFromEuler(0, 0, 0); // (-Math.PI / 2, 0, 0);
		this.physicsWorld.addBody(groundBody);
		const radius = 500;
		const sphereBody = new CANNON.Body({
			mass: 5,
			shape: new CANNON.Sphere(radius),
		});
		sphereBody.position.set(2000, 200, 5000);
		this.physicsWorld.addBody(sphereBody);
		this.cannonDebugger = new CannonDebugger(this.debugScene, this.physicsWorld, { color: 0xff0000 });
	}

	update(t) {
		this.tick += 1;
		if (this.tick > 1000000) this.tick = 0;
		const deltaTWorldTime = (t / 1000) * this.worldTimePerGameTime;
		this.worldTime = (this.worldTime + deltaTWorldTime) % SECONDS_PER_DAY;
		this.actors.forEach((actor) => actor.update(t, this));
		this.physicsWorld.fixedStep();
		this.cannonDebugger.update();
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
		return item;
	}

	addNewItem(itemData = {}) {
		const item = this.makeItem(itemData);
		this.items.push(item);
		return item;
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
