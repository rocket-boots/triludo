import { ArrayCoords, Random, TAU, PI, Pool } from 'rocket-boots';
import Entity from './Entity.js';

const CLOSE_ENOUGH = 100; // 2m
const SLOW_DIST = 500; // 25m ~ 8 ft

class Actor extends Entity {
	constructor(options = {}) {
		super(options);
		this.alive = true;
		this.mobile = true;
		this.physics = true;
		this.mass = options.mass || 60; // kg
		this.stamina = new Pool(50, 50);
		this.staminaRegenPerSecond = 5;
		this.staminaUsePerWalk = 1.3; // per second
		this.health = new Pool(50, 50);
		this.healthRegenPerSecond = 2;
		this.tiredMultiplier = 0.3;
		this.sprintMultiplier = 2;
		this.emotions = [];
		this.spiritId = options.spiritId;
		this.isActor = true;
		this.lookTargetEntity = null;
		this.lookTargetDistance = Infinity;
		this.currentPlan = { name: 'rest', moveTarget: null };
		this.cooldowns = {
			planning: 0,
			looking: 0,
			//
		};
		// this.lookDistance = 1000;
		this.huntDistance = 0; // Goes aggro if hungry and has stamina
		this.attentionDistance = 900; // Turns and looks
		this.fleeDistance = 0; // run away
		this.damageRange = 40;
		this.maxWanderRange = 1400;
		this.turnSpeed = TAU / 1000; // (radians/ms) one rotation in 1000 ms (1 second)
		this.walkForce = 1000 * this.mass;
		this.jumpForce = this.walkForce * 100;
		this.setProperties(options);
		this.animationName = 'idle';
	}

	getDamage() {
		const m = this.aggro ? 2 : 1;
		this.animationName = 'attack'; // TODO: put this somewhere else
		return (10 + Random.randomInt(10)) * m;
	}

	jump(t) {
		if (!this.grounded) return false;
		let { jumpForce } = this;
		if (this.stamina.atMin()) jumpForce *= this.tiredMultiplier;
		this.applyImpulse(t, [0, 0, jumpForce]);
		return true;
	}

	walk(t, directionOffset = 0, multiplier = 1) {
		let { walkForce } = this;
		walkForce *= multiplier; // a scalar force
		const seconds = t / 1000;
		// it feels good to walk in the air (a little bit at least)
		if (!this.grounded) walkForce *= 0.2;
		if (this.stamina.atMin()) walkForce *= this.tiredMultiplier;
		this.applyPlanarImpulse(t, walkForce, directionOffset);
		this.stamina.subtract(this.staminaUsePerWalk * multiplier * seconds);
		this.animationName = 'walk';
	}

	sprint(t, direction = 0) {
		this.walk(t, direction, this.sprintMultiplier);
	}

	heatUp(name, seconds) {
		this.cooldowns[name] = seconds;
	}

	coolDown(name, seconds = 0) {
		if (this.cooldowns[name] > 0) this.cooldowns[name] -= seconds;
		if (this.cooldowns[name] < 0) this.cooldowns[name] = 0;
	}

	updateTimers(seconds = 0) {
		Object.keys(this.cooldowns).forEach((cdName) => {
			this.coolDown(cdName, seconds);
		});
	}

	regenerate(seconds = 0) {
		if (!this.movementForce) {
			const stamHeal = this.staminaRegenPerSecond * seconds;
			this.stamina.add(stamHeal);
		}
		const healthHeal = this.healthRegenPerSecond * seconds;
		this.health.add(healthHeal);
	}

	// updateEmotions() {
	// TODO
	// }

	updateLook(t, simWorld) {
		if (!this.autonomous) return null;
		// Look for a new target?
		if (this.cooldowns.looking) return null;
		// Reset look - assume no target
		this.lookTargetEntity = null;
		this.lookTargetDistance = Infinity;
		this.heatUp('looking', 1);
		// Do the look in the game world
		const filter = (actor) => (actor.faction !== this.faction && actor.entityId !== this.entityId);
		const [dist, who] = simWorld.findNearestActor(this.coords, filter);
		if (!who) return [dist, who];
		if (dist < this.fleeDistance) {
			// Don't set the `lookTargetEntity` because we don't want to turn and look at
			// the thing we're scared of, we'd rather look away
			this.lookTargetEntity = null;
			this.lookTargetDistance = dist;
		} else if (dist < this.attentionDistance
			|| dist < this.huntDistance
		) {
			this.lookTargetEntity = who;
			this.lookTargetDistance = dist;
		}
		// console.log('Looking', dist, who);
		return [dist, who];
	}

	updatePlan() {
		if (!this.autonomous) return null;
		if (this.cooldowns.planning) return null;
		if (this.stamina.atMin()) {
			// Just rest
			this.heatUp('planning', 30);
			return { name: 'rest', moveTarget: null };
		}
		// Plan based on distances
		const { lookTargetDistance } = this;
		if (lookTargetDistance < this.fleeDistance && Random.chance(0.8)) {
			const angleToThreat = ArrayCoords.getAngleFacing(this.coords, this.lookTargetEntity.coords);
			const angleAway = (angleToThreat + PI) % TAU;
			const moveTarget = ArrayCoords.polarToCartesian(this.fleeDistance, angleAway);
			this.heatUp('planning', Random.randomInt(8));
			return { name: 'flee', moveTarget };
		}
		if (lookTargetDistance < this.huntDistance && Random.chance(0.8)) {
			this.heatUp('planning', 1); // re-plan soon so we can follow
			const moveTarget = [...this.lookTargetEntity.coords];
			return { name: 'hunt', moveTarget, aggro: true };
		}
		if (lookTargetDistance < this.attentionDistance && Random.chance(0.5)) {
			this.heatUp('planning', 2 + Random.randomInt(8));
			return { name: 'watch', moveTarget: null };
		}
		if (this.wandering) {
			const deltaX = Random.randomInt(this.maxWanderRange) - Random.randomInt(this.maxWanderRange);
			const deltaY = Random.randomInt(this.maxWanderRange) - Random.randomInt(this.maxWanderRange);
			const moveTarget = ArrayCoords.add(this.coords, [deltaX, deltaY, 0]);
			this.heatUp('planning', 11 + Random.randomBell(10));
			return { name: 'wander', moveTarget };
			// console.log(this.name, 'planning a wander');
		}
		return { name: 'rest', moveTarget: null };
	}

	updateMovement(t, moveTarget) {
		if (!this.mobile || !this.autonomous) return;
		if (!moveTarget) {
			if (this.lookTargetEntity) {
				this.turnToward(this.lookTargetEntity.coords, t * this.turnSpeed);
			}
			return;
		}
		// Since moveTarget usually doesn't have a z component, we don't want to
		// include our z values in the distance calculation.
		const [x, y] = this.coords;
		const coords2d = [x, y, 0];
		const distanceToTarget = ArrayCoords.getDistance(coords2d, moveTarget);
		if (distanceToTarget < CLOSE_ENOUGH) {
			// console.log('Got to target');
			this.currentPlan = { name: 'rest', moveTarget: null };
			return;
		}
		// Do things slower if we're near the destination
		const proximityFraction = (distanceToTarget > SLOW_DIST) ? 1 : (distanceToTarget / SLOW_DIST);
		// Don't turn faster than your turn speed
		const maxTurnRadians = t * this.turnSpeed * proximityFraction;
		const remainderToTurn = this.turnToward(moveTarget, maxTurnRadians);
		// Don't walk until we've turned
		if (remainderToTurn < 0.2) this.walk(t, 0, proximityFraction);
	}

	update(t, simWorld) {
		const seconds = t / 1000;
		this.health.clearLastDelta(); // TODO: move this somewhere else?
		this.regenerate(seconds);
		this.updateTimers(seconds);
		// this.updateEmotions(t);
		this.updateLook(t, simWorld);
		// Make a plan and handle it
		const newPlan = this.updatePlan(t);
		if (newPlan) this.currentPlan = newPlan;
		this.aggro = this.currentPlan.aggro || false;
		this.updateMovement(t, this.currentPlan.moveTarget);
		if (this.currentPlan.name === 'rest') this.animationName = 'idle';
		this.updatePhysics(t);
	}
}

export default Actor;
