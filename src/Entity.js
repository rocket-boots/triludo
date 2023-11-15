import { ArrayCoords, Random, applyFrictionToVelocity, getAccelerationDueToForce } from 'rocket-boots';

const { X, Y, Z } = ArrayCoords;

class Entity {
	constructor(properties = {}) {
		this.entityId = Random.uniqueString();
		this.isEntity = true;
		this.coords = [0, 0, 0];
		this.facing = 0; // radians - 0 --> along the x axis
		// Positive radians are turning left (anti-clockwise)
		// Negative radians are turning right (clockwise)
		this.lookAt = [0, 0, 0]; // Calculated value
		this.vel = [0, 0, 0];
		this.frictionVel = [0, 0, 0];
		this.acc = [0, 0, 0];
		// Good to stop velocity from skyrocketing
		this.maxVelocity = 600;
		// track movement force know when entity is moving on its own and adjust friction
		this.movementForce = 0;
		this.tags = [];
		this.renderAs = 'box';
		this.color = 0xffffff;
		this.inventory = [];
		this.inventorySize = 0;
		// heightSizeOffset needs to be 0.5 for objects that have their center at the center of
		// the model, but should be 0 for models that have the center by their bottom already.
		this.heightSizeOffset = 0.5;
		this.size = 2;
		this.lookLength = 30;
		this.remove = false;
		this.setProperties(properties);
	}

	setProperties(properties = {}) {
		Object.keys(properties).forEach((key) => {
			this[key] = JSON.parse(JSON.stringify(properties[key]));
		});
	}

	/* eslint-disable no-param-reassign */
	static setX(entity, x) { entity.coords[X] = x; }

	static setY(entity, y) { entity.coords[Y] = y; }

	static setZ(entity, z) { entity.coords[Z] = z; }
	/* eslint-enable no-param-reassign */

	setX(x) { this.coords[X] = x; }

	setY(y) { this.coords[Y] = y; }

	setZ(z) { this.coords[Z] = z; }

	getCoords() {
		return [...this.coords];
	}

	setGrounded(grounded, h) {
		this.grounded = grounded;
		// if (this.isCharacter) console.log(grounded, h);
		if (typeof h === 'number' && grounded) this.setZ(h);
	}

	moveTo(coords) {
		const [x, y, z] = coords;
		if (typeof x === 'number') this.coords[0] = x;
		if (typeof y === 'number') this.coords[1] = y;
		if (typeof z === 'number') this.coords[2] = z;
	}

	move(relativeCoords = []) {
		this.moveTo(ArrayCoords.add(this.coords, relativeCoords));
	}

	calcLookAt() {
		const [x, y] = ArrayCoords.polarToCartesian(this.lookLength, this.facing);
		const h = this.coords[Z];
		// TODO: ^ Add the relative height of the terrain at the x,y spot
		this.lookAt = ArrayCoords.add(this.coords, [x, y, h]);
		return this.lookAt;
	}

	turn(relativeRadians = 0) {
		this.facing += relativeRadians;
		this.calcLookAt();
	}

	setFacing(angle = 0) {
		this.facing = angle;
		this.calcLookAt();
	}

	faceToward(target) {
		// console.log('faceToward', target);
		this.setFacing(ArrayCoords.getAngleFacing(this.coords, target));
	}

	turnToward(target, maxRadians = Infinity) {
		const desiredAngle = ArrayCoords.getAngleFacing(this.coords, target);
		const desiredTurn = desiredAngle - this.facing;
		const actual = Math.min(maxRadians, desiredTurn);
		this.turn(actual);
		return desiredTurn - actual; // what's left
	}

	getTags() {
		return this.tags;
	}

	hasTag(tag) {
		const entityTags = this.getTags();
		return entityTags.includes(tag);
	}

	hasOneOfTags(tags = []) {
		const entityTags = this.getTags();
		const matchingTags = entityTags.filter((tag) => tags.includes(tag));
		return (matchingTags.length > 0);
	}

	getInventoryCount() {
		const itemsInInv = this.inventory.filter((item) => item);
		return itemsInInv.length;
	}

	addToInventory(thing) {
		if (this.getInventoryCount() >= this.inventorySize) return false;
		// TODO: Look for the first empty spot, if none then do push
		this.inventory.push(thing);
		return true;
	}

	takeFromInventory(i) {
		if (typeof i !== 'number') throw new Error('i needs to be a number');
		const item = this.inventory[i];
		this.inventory[i] = null;
		return item || null;
	}

	takeSelectionFromInventory(selector = '') {
		const [givePropertyName, givePropertyValue] = selector.split(':');
		const [index] = this.findInInventory(givePropertyName, givePropertyValue);
		if (index === -1) return null;
		return this.takeFromInventory(index);
	}

	findInInventory(propertyName, value) {
		// const itemsInInv = this.inventory.filter((item) => item);
		const matchTruthy = (typeof value === 'undefined');
		let firstFoundIndex = -1;
		const doesMatch = (item) => {
			if (!item) return false;
			if (matchTruthy) return Boolean(item[propertyName]);
			return (item[propertyName] === value);
		};
		const matchingItems = this.inventory.filter((item, i) => {
			const m = doesMatch(item);
			if (m && firstFoundIndex === -1) firstFoundIndex = i;
			return m;
		});
		return [firstFoundIndex, matchingItems];
	}

	applyForce(force = []) {
		if (!this.mass) return;
		this.acc = ArrayCoords.add(this.acc, getAccelerationDueToForce(force, this.mass));
	}

	applyImpulse(t, directedForcePerSecond = [0, 0, 0]) {
		const seconds = t / 1000;
		const impulseForce = ArrayCoords.multiply(directedForcePerSecond, seconds);
		this.applyForce(impulseForce);
		this.movementForce = impulseForce;
	}

	// For walking on the x, y plane
	applyPlanarImpulse(t, force = 0, direction = 0) {
		const angleOfForce = (this.facing + direction); // not sure why we need to negate this
		const directedForce = [
			force * Math.cos(angleOfForce),
			force * Math.sin(angleOfForce),
			0,
		];
		this.applyImpulse(t, directedForce);
	}

	updatePhysics(t, options = {}) {
		if (!this.physics) return null;
		const seconds = t / 1000;
		const {
			gravity = [0, 0, -80],
			// Friction velocity magnitude percentages per millisecond
			groundFriction = 0.006,
			airFriction = 0.0001,
			accelerationDecay = 0.9,
		} = options;
		// Acceleration due to gravity
		if (!this.grounded) this.acc = ArrayCoords.add(this.acc, gravity);
		// Velocity
		const deltaVel = ArrayCoords.multiply(this.acc, seconds);
		this.vel = ArrayCoords.add(this.vel, deltaVel);
		// if (!this.grounded) this.vel = ArrayCoords.add(this.vel, gravity);
		this.vel = ArrayCoords.clampEachCoord(this.vel, -this.maxVelocity, this.maxVelocity);
		const deltaPos = ArrayCoords.multiply(this.vel, seconds);
		this.coords = ArrayCoords.add(this.coords, deltaPos);
		// Acceleration due to force is only momentary
		// this.acc = [0, 0, 0];
		/// ...but let's try to make it last a little longer?
		this.acc = ArrayCoords.multiply(this.acc, accelerationDecay);
		// Apply friction (as a velocity) - TODO: apply as a force for more realistic physics
		const friction = ((this.grounded) ? groundFriction : airFriction) * t;
		this.vel = applyFrictionToVelocity(this.vel, friction, this.movementForce);
		// Round down to zero to stop unnecessary calculations approaching zero
		this.vel = [
			(Math.abs(this.vel[X]) < 0.001) ? 0 : this.vel[X],
			(Math.abs(this.vel[Y]) < 0.001) ? 0 : this.vel[Y],
			(Math.abs(this.vel[Z]) < 0.001) ? 0 : this.vel[Z],
		];
		this.movementForce = 0;
		return true;
	}

	update(t) {
		// this.updateTimers(t);
		this.updatePhysics(t);
	}
}

export default Entity;
