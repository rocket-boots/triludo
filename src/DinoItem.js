import { ArrayCoords, clamp } from 'rocket-boots';

import Entity from './Entity.js';

class DinoItem extends Entity {
	constructor(properties = {}) {
		super(properties);
		this.interactionProgress = 0;
	}

	static isItemInteractable(item) {
		return Boolean(
			item.interactionRange && item.interactionAction && item.interactionResult,
		);
	}

	static isItemInRangeInteractable(item, coords) {
		if (!DinoItem.isItemInteractable(item)) return false;
		const distance = ArrayCoords.getDistance(item.coords, coords);
		return (distance <= item.interactionRange);
	}

	static interact(item, who, amount) {
		if (!item) return 0;
		return item.interact(who, amount);
	}

	getInteractionPercent() {
		if (!this.interactionEffort) return 1;
		return clamp(this.interactionProgress / this.interactionEffort);
	}

	interact(who, amount = 0) {
		if (!DinoItem.isItemInRangeInteractable(this, who.coords)) return [];
		if (this.interactionEffort) {
			this.interactionProgress += amount;
			const percent = this.getInteractionPercent();
			if (percent < 1) return [];
		}
		// either no effort is needed, or we're done with the progress
		if (!this.interactionResult) {
			console.warn('No interaction result for item');
			return [];
		}
		const messages = Object.keys(this.interactionResult).reduce((messagesArr, resultKey) => {
			if (resultKey === 'modify') {
				const { modify } = this.interactionResult;
				Object.keys(modify).forEach((propName) => {
					this[propName] = modify[propName];
				});
			}
			if (resultKey === 'pickUp' && this.interactionResult.pickUp) {
				const added = who.addToInventory(this);
				this.remove = added;
				console.log(this, 'removed?', added);
				if (added && this.inventoryDescription) {
					messagesArr.push(
						`You pick up the ${this.name}.
						${this.inventoryDescription}`,
					);
				}
			} else if (resultKey === 'give' && this.interactionResult.give) {
				const item = who.takeSelectionFromInventory(this.interactionResult.give);
				if (item) {
					this.addToInventory(item);
					messagesArr.push('You give an item...');
				} else {
					messagesArr.push('You do not have any items that can be used here.');
				}
			} else if (resultKey === 'repair' && this.interactionResult.repair) {
				const item = who.takeSelectionFromInventory(this.interactionResult.repair);
				if (item) {
					// this.addToInventory(item);
					this.damage -= 1;
					messagesArr.push(`You use an item to repair the ${this.name}`);
				} else {
					messagesArr.push('You do not have any items that can be used to repair.');
				}
			}
			// else -- things like spawning something, damage, effects
			return messagesArr;
		}, []);
		return messages;
	}
}

export default DinoItem;
