import { Random } from 'rocket-boots';
import SimWorld from './triludo/SimWorld.js';
import dinos from './dinos.js';

const PART_SIZE = 20;
const PART = {
	name: 'Time travel machine part',
	randomAtRadius: 100,
	size: PART_SIZE,
	rooted: true,
	scannable: true,
	timeTravelPart: true,
	interactionRange: PART_SIZE + 40,
	interactionAction: 'Dig',
	interactionEffort: 100,
	heightSizeOffset: 0,
	inventoryDescription: 'This should be useful for rebuilding your time machine.',
	interactionResult: {
		modify: {
			heightSizeOffset: 0.5,
			rooted: false,
			// collectible: true,
			interactionAction: 'Pick up',
			interactionEffort: 0,
			interactionResult: { pickUp: true },
		},
	},
	castShadow: true,
	renderAs: 'model',
	model: 'gear',
};
const PARTS = [
	{ ...PART, randomAtRadius: 400, model: 'sputnik', heightSizeOffset: -0.5 },
	{ ...PART, randomAtRadius: 600 },
	{ ...PART, randomAtRadius: 700, model: 'computer', heightSizeOffset: -0.5 },
	{ ...PART, randomAtRadius: 1200, model: 'commandPod', heightSizeOffset: -0.25 },
	{ ...PART, randomAtRadius: 2200, model: 'sputnik' },
	{ ...PART, randomAtRadius: 2000 },
	{ ...PART, randomAtRadius: 3000, model: 'sputnik' },
	{ ...PART, randomAtRadius: 4000, model: 'computer' },
	{ ...PART, randomAtRadius: 5000 },
];
// Powers:
// - GPS Gravitation-wave Positioning System -- provides x,y,z coordinates
// - Compass --- provides N, S, E, W compass
// - Scanner --- provides some way to detect parts
// - threat monitor --- beeps when a creature neatby is aggro'd
// - rocket boots --- big jumps
// - Chrono-collector --- collects time resource
// - time-stopper --- drops a bubble that stops everyone but character in a radius
// - ranged time-stopper --- time bubble near where it's fired
// - overhead camera --- provides a map view
// - scanning visor --- provides a wireframe view with things highlighted
// - drone --- provides a mobile viewing system
// - laser gun
const PARTS_NEEDED = 6;
const ITEMS = [
	...PARTS,
	{
		name: 'time machine',
		isTimeMachine: true,
		randomAtRadius: 10,
		rooted: true,
		scannable: true,
		size: 20,
		heightSizeOffset: 0,
		renderAs: 'model',
		model: 'teleporter',
		inventorySize: 100,
		// color: [1, 1, 1],
		interactionRange: 80,
		interactionAction: 'Add part',
		interactionEffort: 0,
		damage: PARTS_NEEDED,
		interactionResult: {
			repair: 'timeTravelPart',
		},
	},
];

export default class DinoWorld extends SimWorld {
	// constructor(...args) {
	// 	super(...args);
	// }

	getTotalParts() { // eslint-disable-line
		return PARTS.length;
	}

	addNewTrees(n, focusCoords) {
		for (let i = n; i > 0; i -= 1) this.addNewTree(focusCoords);
	}

	addNewTree(focusCoords) {
		const coords = this.getRandomSpawnCoords(focusCoords);
		this.addNewItem({
			isTree: true,
			color: Random.pick(['#76c379', '#508d76']),
			renderAs: 'model',
			model: 'royalPalm',
			coords,
			rooted: true,
		});
		// TODO:
		// Create random tree and find a location
		// Add a despawnRadius
		// Then also run this a few more times when a new chunk is loaded
	}

	addNewDino(focusCoords) {
		const coords = this.getRandomSpawnCoords(focusCoords);
		const [distance] = this.findNearestActor(coords);
		if (distance < this.spawnActorDistance) return null;
		// const randColor = () => (0.5 + (Random.random() * 0.5));
		const dinoKey = Random.pick(Object.keys(dinos));
		const dinoOpt = dinos[dinoKey];
		const dino = this.addNewActor(dinoOpt);
		dino.coords = coords;
		console.log('Added dino', dino.name, dino.entityId);
		return dino;
	}

	build(focusCoords) {
		ITEMS.forEach((itemData) => {
			this.addNewItem(itemData);
		});
		// this.addNewTrees(32, focusCoords);
	}
}
