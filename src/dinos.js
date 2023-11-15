import { TAU } from 'rocket-boots';

const defaultMass = 10000;

const defaultDino = {
	name: 'Dino',
	autonomous: true,
	isDinosaur: true,
	wandering: true,
	size: 60,
	damageRange: 60,
	heightSizeOffset: 0,
	// color: [randColor(), randColor(), randColor()],
	walkForce: 900 * defaultMass,
	mass: defaultMass,
	attentionDistance: 1000,
	fleeDistance: 0,
	huntDistance: 0,
	renderAs: 'model', // renderAs: 'sphere',
	turnSpeed: TAU / 3000,
};
const dinos = {
	apat: {
		...defaultDino,
		model: 'apat',
		faction: 'herbivore',
		name: 'Dino apat',
		mass: defaultMass * 2.5,
		turnSpeed: TAU / 5000,
	},
	para: {
		...defaultDino,
		model: 'para',
		faction: 'herbivore',
		name: 'Dino para',
		mass: defaultMass * 0.6,
	},
	steg: {
		...defaultDino,
		model: 'steg',
		faction: 'herbivore',
		name: 'Dino steg',
		mass: defaultMass,
	},
	trex: {
		...defaultDino,
		model: 'trex',
		faction: 'trex',
		name: 'Dino trex',
		mass: defaultMass * 1.5,
		huntDistance: 500,
	},
	tric: {
		...defaultDino,
		model: 'tric',
		faction: 'tric',
		name: 'Dino tric',
		mass: defaultMass * 1.3,
	},
	velo: {
		...defaultDino,
		model: 'velo',
		faction: 'velo',
		name: 'Dino velo',
		mass: defaultMass * 0.5,
		huntDistance: 500,
	},
};

export default dinos;
