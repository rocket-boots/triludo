/* eslint-disable class-methods-use-this */
import Interface from './triludo/Interface.js';

const UNITS_PER_METER = 20; // TODO: get from world

function round(n = 0, m = 100) {
	return Math.round(n * m) / m;
}

class DinoInterface extends Interface {
	constructor() {
		super();
		this.log = [];
		this.lastDisplayedLogLength = 0;
		this.logShow = 3;
	}

	updateInteraction(item) {
		if (!item) {
			DinoInterface.hide('#interaction-details');
			return;
		}
		DinoInterface.show('#interaction-details');
		DinoInterface.setText('#interaction-target', DinoInterface.getItemName(item));
		let actionText = item.interactionAction || 'Interact';
		const percent = item.getInteractionPercent();
		if (percent < 1) actionText += ` ${Math.floor(percent * 100)}%`;
		DinoInterface.setText('#interaction-action-name', actionText);
		DinoInterface.setText('#interaction-tip', (item.interactionEffort) ? 'Hold' : '');
	}

	updateDebug(debug, actor) {
		const html = `
			Last delta T: ${round(debug.lastDeltaT)}<br>
			Acc:<br>${actor.acc.map((v) => round(v)).join('<br>')}<br>
			Vel:<br>${actor.vel.map((v) => round(v)).join('<br>')}<br>
			Pos:<br>${actor.coords.map((v) => round(v)).join('<br>')}<br>
			${actor.grounded ? 'Grounded' : 'Air'}
		`;
		// Friction Vel:<br>${actor.frictionVel.map((v) => round(v, 1000)).join('<br>')}<br>
		DinoInterface.setHtml('#debug', html);
	}

	updateScanner(scanResults = []) {
		// TODO: Remove - very specific to Chronosaur
		/*
		let nearestDistance = Infinity;
		let nearestTimeMachine = false;
		const listItems = scanResults
			.map(({ item, distance, percent, sortAngle, behind, front }) => {
				// No less than 1%, and round to .00
				const displayPercent = Math.max(1, round(100 * percent));
				const classes = ['scan-bar'];
				if (item.isTimeMachine) classes.push('scan-bar-time-machine');
				if (distance < nearestDistance) {
					nearestDistance = distance;
					nearestTimeMachine = item.isTimeMachine;
				}
				if (behind) classes.push('scan-bar-behind');
				if (front) classes.push('scan-bar-front');
				return `<li class="${classes.join(' ')}" style="height: ${displayPercent}%;">
					<span>${round(distance / UNITS_PER_METER)}m ${round(sortAngle)}rad</span>
				</li>`;
			});
		DinoInterface.setHtml('#scans', listItems.join(''));
		DinoInterface.setText(
			'#nearest-scan',
			`Nearest: ${round(nearestDistance / UNITS_PER_METER)} m ${nearestTimeMachine ? '(Time machine)' : ''}`,
		);
		*/
	}

	updateLog() {
		if (this.log.length === this.lastDisplayedLogLength) return; // No changes
		this.lastDisplayedLogLength = this.log.length;
		const latest = this.log.slice(this.logShow * -1);
		const listItems = latest.map((message) => `<li>${message}</li>`);
		DinoInterface.setHtml('#log-list', listItems.join(''));
	}

	updateInventory(inventory = []) {
		const listItems = inventory.map((item) => `<li class="${(!item) ? 'inv-empty' : ''}">${item}</li>`);
		DinoInterface.setHtml('#inv-list', listItems.join(''));
	}

	updateStats(actor) { // actor is main character
		const statBars = [
			{ name: 'stamina', value: actor.stamina.get(), barClass: 'stat-bar-stamina' },
			{ name: 'health', value: actor.health.get(), barClass: 'stat-bar-health' },
		];
		const listItems = statBars.map((bar) => `<li class="stat-bar ${bar.barClass}" style="height: ${bar.value}%;">
			<span>${bar.name} ${bar.value}</span>
		</li>`);
		DinoInterface.setHtml('#stat-list', listItems.join(''));
		if (actor.health.lastDelta < 0) {
			this.flashBorder('#933f45');
		}
	}

	updateClock(worldTimeArray) {
		const [hours, minutes] = worldTimeArray;
		const hourDegrees = Math.round((hours / 12) * 360);
		const minutesDegrees = Math.round((minutes / 60) * 360);
		DinoInterface.$('#world-clock .clock-hour-hand').style.transform = `rotate(${hourDegrees}deg)`;
		DinoInterface.$('#world-clock .clock-minute-hand').style.transform = `rotate(${minutesDegrees}deg)`;
		const minutesStr = ((minutes < 10) ? '0' : '') + minutes;
		DinoInterface.setText('#world-clock .clock-text', [hours, minutesStr].join(':'));
	}

	render(interfaceUpdates = {}) {
		const {
			item, actor, scanResults, inventory, debug, worldTimeArray,
		} = interfaceUpdates;
		this.updateLog();
		if (debug) this.updateDebug(debug, actor);
		this.updateInteraction(item);
		this.updateScanner(scanResults);
		this.updateStats(actor);
		this.updateClock(worldTimeArray);
		this.updateLog();
		this.updateInventory(inventory);
	}
}

export default DinoInterface;
