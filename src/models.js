const defaultModel = {
	castShadows: true,
};
const TECH_COLOR = '#c2b5a9';

export default {
	royalPalm: {
		...defaultModel,
		path: 'trees/RoyalPalmTreeGLB.glb',
		scale: 6,
		color: '#76c379', // [0.3, 0.7, 0.3],
	},
	commandPod: {
		path: 'tech/Command_pod.glb',
		scale: 10,
		color: '#7d6e6e',
	},
	// clock: {
	// 	path: 'tech/Analog_clock.glb',
	// 	scale: 2,
	// 	color: TECH_COLOR,
	// },
	computer: {
		path: 'tech/Computer_Large.glb',
		scale: 15,
		color: TECH_COLOR,
	},
	// disposalUnit: {
	// 	path: 'tech/Garbage_disposal_unit.glb',
	// 	scale: 1,
	// 	color: TECH_COLOR,
	// },
	teleporter: {
		path: 'tech/Turret_Teleporter.fbx',
		scale: 1,
		color: TECH_COLOR,
	},
	sputnik: {
		path: 'tech/Sputnik.glb',
		scale: 2,
		color: TECH_COLOR,
	},
	gear: {
		path: 'tech/Collectible_Gear.glb',
		scale: 40,
		color: TECH_COLOR,
	},
	// apatosaurus1: {
	// 	path: 'dinos/converted/Apatosaurus.gltf',
	// 	scale: 10,
	// },
	// apatosaurus2: {
	// 	path: 'dinos/converted/Apatosaurus.glb',
	// 	scale: 10,
	// },
	// tRex: {
	// 	...defaultModel,
	// 	path: 'dinos/converted/Trex.glb',
	// 	scale: 10,
	// 	color: [0.7, 0.2, 0.1],
	// },
	// diplodocus: {
	// 	path: 'dinos/GLB/Diplodocus.glb',
	// 	scale: 0.2,
	// },
	// steg: {
	// 	path: 'dinos/GLB/steg.glb',
	// 	scale: 10,
	// },
	// veloGlb: {
	// 	...defaultModel,
	// 	path: 'dinos/Exported/Velo.glb',
	// 	scale: 10,
	// 	color: [0.6, 0.2, 0.1],
	// },
	/*
	apat: {
		...defaultModel,
		path: 'dinos/FBX/Apatosaurus.fbx',
		scale: 0.1,
		color: '#535c89', // [0.5, 0.5, 0.7],
		animationIndices: {
			walk: 0,
			attack: 1,
			idle: 2, // Nothing?: 2
			jump: 3,
			run: 4,
			die: 5,

			zero: 0,
			one: 1,
			two: 2,
			three: 3,
			four: 4,
			five: 5,
			six: 6,
		},
	},
	para: {
		...defaultModel,
		path: 'dinos/FBX/Parasaurolophus.fbx',
		scale: 0.1,
		color: '#7b99c8', // [0.3, 0.6, 0.6],
		animationIndices: {
			walk: 0,
			attack: 1,
			run: 2, // or walk?
			jump: 3,
			die: 4,
			idle: 5,

			zero: 0,
			one: 1,
			two: 2,
			three: 3,
			four: 4,
			five: 5,
			six: 6,
		},
	},
	steg: {
		...defaultModel,
		path: 'dinos/FBX/Stegosaurus.fbx',
		scale: 0.1,
		color: '#dacb80', // [0.6, 0.6, 0.3],
		animationIndices: {
			idle: 0,
			run: 1,
			jump: 2,
			walk: 3,
			die: 4,
			attack: 5,

			zero: 0,
			one: 1,
			two: 2,
			three: 3,
			four: 4,
			five: 5,
			six: 6,
		},
	},
	trex: {
		...defaultModel,
		path: 'dinos/FBX/Trex.fbx',
		scale: 0.1,
		color: '#933f45', // [0.65, 0.2, 0.1],
		animationIndices: {
			jump: 0,
			attack: 1,
			idle: 2,
			walk: 3,
			run: 4, // not entirely sure about walk vs run
			die: 5,

			zero: 0,
			one: 1,
			two: 2,
			three: 3,
			four: 4,
			five: 5,
			six: 6,
		},
	},
	tric: {
		...defaultModel,
		path: 'dinos/FBX/Triceratops.fbx',
		scale: 0.1,
		color: '#be7979', // [0.5, 0.7, 0.2],
		animationIndices: {
			die: 0,
			run: 1,
			walk: 2,
			idle: 3,
			jump: 4,
			attack: 5,

			zero: 0,
			one: 1,
			two: 2,
			three: 3,
			four: 4,
			five: 5,
			six: 6,
		},
	},
	velo: {
		...defaultModel,
		path: 'dinos/FBX/Velociraptor.fbx',
		scale: 0.1,
		color: '#b25e46', // [0.7, 0.5, 0.2],
		animationIndices: {
			jump: 0,
			idle: 1,
			run: 2,
			walk: 3,
			attack: 4,
			die: 5,

			zero: 0,
			one: 1,
			two: 2,
			three: 3,
			four: 4,
			five: 5,
			six: 6,
		},
	},
	*/
};
