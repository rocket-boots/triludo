/* eslint-disable class-methods-use-this */
import { StateCommander, MouseWheelWatcher, Looper, Random, clamp } from 'rocket-boots';
import { SoundController } from 'sound-controller';

import Entity from './Entity.js';

const { PI } = Math;
const TAU = PI * 2;
const HALF_PI = PI / 2;

class GenericGame extends StateCommander {
	constructor(options = {}) {
		const {
			SceneClass, // required
			WorldClass, // required
			InterfaceClass, // required
			ActorClass = Entity, // recommended - for world
			ItemClass = Entity, // recommended - for world
			SoundControllerClass = SoundController, // recommended
			states, // recommended
			minMouseWheel = -100,
			maxMouseWheel = 100,
			sounds = {},
			music = {},
		} = options;
		super({ states });
		this.lastDeltaT = 0; // just for debug/tracking purposes
		this.minMouseWheel = minMouseWheel;
		this.maxMouseWheel = maxMouseWheel;
		this.loop = new Looper();
		this.sounds = new SoundControllerClass(sounds, music);
		this.mouseWheelWatcher = new MouseWheelWatcher({ min: minMouseWheel, max: maxMouseWheel });
		this.gameScene = new SceneClass({ models: options.models });
		this.world = new WorldClass({
			ActorClass, ItemClass,
		});
		this.interface = new InterfaceClass();
		this.players = [];
		this.spirits = [];
		this.tick = 0;
	}

	render(renderData = {}, t = 5) {
		const {
			sceneUpdateOptions = {},
			interfaceUpdates = {},
		} = renderData;
		this.interface.render(interfaceUpdates);
		// Send updates to the scene
		this.gameScene.update(sceneUpdateOptions, t).render();
	}

	gameTick(t) { // You should overwrite this method
		this.tick += 1;
		if (this.tick > 1000000) this.tick = 0;
		this.world.update(t);
		return {};
	}

	assembleRenderData(gameTickData = {}) { // You should overwrite this method
		return {
			...gameTickData,
		};
	}

	animationTick(deltaT) {
		// Clamp the value to 100 ms so that it doesn't go overboard if the
		// animation doesn't run in a long time
		this.lastDeltaT = deltaT; // just for debug/tracking purposes
		const t = clamp(deltaT, 0, 100);
		const gameTickData = this.gameTick(t);
		const renderData = this.assembleRenderData(gameTickData);
		this.render(renderData, t);
	}

	startAnimationGameLoop() {
		this.loop.set((t) => this.animationTick(t)).start();
	}

	stopAnimationGameLoop() {
		this.loop.stop();
	}

	makePlayer() { // eslint-disable-line
		const playerId = Random.uniqueString();
		const spiritId = Random.uniqueString();
		const player = { playerId }; // TODO: give a uid
		const spirit = { spiritId, playerId }; // TODO: give a uid and link to player uid
		return { player, spirit };
	}

	addNewPlayer() {
		const { player, spirit } = this.makePlayer();
		this.players.push(player);
		this.spirits.push(spirit);
		return { player, spirit };
	}

	// Pass-through methods - TODO: Remove
	findNearestActor(coords, filterFn) {
		return this.world.findNearestActor(coords, filterFn);
	}
}

GenericGame.PI = PI;
GenericGame.TAU = TAU;
GenericGame.HALF_PI = HALF_PI;

export default GenericGame;
