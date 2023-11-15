import DinoGame from './DinoGame.js';
// import test from './test.js';

const game = new DinoGame({
	textures: {

	},
	sounds: {

	},
	prototypes: {
		tree: { rooted: 1, renderAs: 'billboard', texture: 'tree.png' },
	},
	terrainItems: {

	},
	specialItems: {

	},
	actors: {

	},
});
window.document.addEventListener('DOMContentLoaded', () => {
	game.start();
});
window.game = game;
window.g = game;

// Replace above with this below for testing model loading
// window.document.addEventListener('DOMContentLoaded', () => test());

export default game;
