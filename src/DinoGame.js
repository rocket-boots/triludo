import { ArrayCoords, Speaker, PointerLocker, averageAngles, HALF_PI, PI, TWO_PI, TAU } from 'rocket-boots';

import DinoScene from './DinoScene.js';
import GenericGame from './triludo/GenericGame.js';
import DinoWorld from './DinoWorld.js';
import TerrainGenerator from './triludo/TerrainGenerator.js';
import Actor from './Actor.js';
import DinoSoundController from './DinoSoundController.js';
import DinoItem from './DinoItem.js';
import DinoInterface from './DinoInterface.js';
import models from './models.js';
import states from './states.js';
import { sounds, music } from './soundsAndMusic.js';
import DinoTerrainGenerator from './DinoTerrainGenerator.js';

const DEFAULT_TIME = 5; // ms

// const { X, Y, Z } = ArrayCoords;
const { Z } = ArrayCoords;

// Color names from https://coolors.co/99d4e6
const DARK_PURPLE = '#352b40';
const EGGPLANT = '#653d48';
const OLD_ROSE = '#be7979';
const NON_PHOTO_BLUE = '#99d4e6';
const VISTA_BLUE = '#7b99c8';
const ULTRA_VIOLET = '#535c89';
const SKY_COLOR_PER_HOUR = [
	DARK_PURPLE, // 0
	DARK_PURPLE, // 1
	DARK_PURPLE,
	DARK_PURPLE,
	DARK_PURPLE,
	EGGPLANT, // 5
	EGGPLANT,
	OLD_ROSE, // 7
	NON_PHOTO_BLUE,
	NON_PHOTO_BLUE, // 9
	NON_PHOTO_BLUE,
	NON_PHOTO_BLUE,
	NON_PHOTO_BLUE, // noon
	NON_PHOTO_BLUE, // 13 (1 pm)
	NON_PHOTO_BLUE,
	VISTA_BLUE,
	VISTA_BLUE,
	ULTRA_VIOLET, // 17 (5pm)
	ULTRA_VIOLET, // 18
	EGGPLANT, // 19 (7 pm)
	EGGPLANT,
	DARK_PURPLE,
	DARK_PURPLE, // 22
	DARK_PURPLE, // 23
	DARK_PURPLE, // 24
];

const WALK_ANGLES = {
	forward: 0,
	back: PI, // Or -PI
	left: HALF_PI,
	right: PI + HALF_PI, // FIXME: Tried -HALF_PI and PI + HALF_PI, but that also gives issues
};

// window.Speaker = Speaker;

class DinoGame extends GenericGame {
	constructor() {
		super({
			models,
			states,
			sounds,
			music,
			minMouseWheel: 0,
			maxMouseWheel: 500,
			SceneClass: DinoScene,
			ActorClass: Actor,
			WorldClass: DinoWorld,
			ItemClass: DinoItem,
			InterfaceClass: DinoInterface,
			SoundControllerClass: DinoSoundController,
			// SoundControllerClass: SoundController,
			TerrainGeneratorClass: DinoTerrainGenerator,
		});
		this.speaker = new Speaker({ voice: 'David', pitch: 1.2, rate: 0.9 });
		this.pointerLocker = new PointerLocker();
		this.cameraPosition = [0, 0, 0];
		this.cameraVerticalRotation = HALF_PI;
		this.timeMachine = null;
		this.headBop = 0.5;
		this.testMode = true;
		this.spawnDinos = true;
		this.scanResults = []; // Need to cache this so we don't calculate every tick
	}

	say(text) {
		if (!this.sounds.isSoundsOn) return;
		this.speaker.speak(text);
	}

	walkCharacter(t, angles = [], sprint = false) {
		if (!angles.length) return;
		const angle = averageAngles(angles);
		const method = (sprint ? 'sprint' : 'walk');
		this.mainCharacter[method](t, angle);
		if (this.mainCharacter.grounded) {
			// this.sounds.play('footsteps', { random: 0.1 });
			if (this.tick % 100 === 0) this.sounds.play('footsteps');
			if (this.headBop) {
				// TODO: this could be improved, and moved into the Actor class
				// this.mainCharacter.heightSizeOffset = this.headBop * Math.sin(this.tick / 10);
			}
		}
	}

	interactNearest(t) {
		const [, iItem] = this.world.findNearestInRangeInteractableItem(this.mainCharacter.coords);
		if (!iItem) return;
		if (this.tick % 100 === 0) this.sounds.play('collect');
		const amount = t / 40;
		const messages = this.world.ItemClass.interact(iItem, this.mainCharacter, amount);
		if (messages) this.interface.addToLog(messages);
		this.setHeightToTerrain(iItem);
	}

	handleCommandsDown(commands = [], t = DEFAULT_TIME) {
		const splitCommands = commands.map((command) => command.split(' '));
		// const firstCommands = commands.map((commandWords) => commandWords[0]);
		const moves = splitCommands.filter((commandWords) => commandWords[0] === 'move');
		let sprint = (commands.includes('sprint'));
		const moveAngles = moves.map((moveCommandWords) => {
			if (moveCommandWords[2] === 'sprint') sprint = true;
			return WALK_ANGLES[moveCommandWords[1]];
		});
		if (this.kbCommander.isKeyDown('W')) moveAngles.push(WALK_ANGLES.forward);
		if (this.kbCommander.isKeyDown('A')) moveAngles.push(WALK_ANGLES.left);
		if (this.kbCommander.isKeyDown('S')) moveAngles.push(WALK_ANGLES.back);
		if (this.kbCommander.isKeyDown('D')) moveAngles.push(WALK_ANGLES.right);
		// if (sprint) console.log('sprint');
		if (moveAngles.length) this.walkCharacter(t, moveAngles, sprint);
		if (commands.includes('jump')) {
			this.mainCharacter.jump(t);
		}
		if (commands.includes('interact nearest')) {
			this.interactNearest(t);
		}
	}

	handleCommand(command) {
		const { mainCharacter } = this;
		const commandWords = command.split(' ');
		const firstCommand = commandWords[0];
		if (firstCommand === 'move') {
			// Figure out the relative angle
			// const angleOfMovement = WALK_ANGLES[commandWords[1]];
			// this.walkCharacter(DEFAULT_TIME, [angleOfMovement], commandWords[2] === 'sprint');
		} else if (firstCommand === 'turn') {
			let turnAmount = TAU / 50;
			if (commandWords[1] === 'right') turnAmount *= -1;
			mainCharacter.turn(turnAmount);
		} else if (firstCommand === 'interact') {
			if (commandWords[1] === 'nearest') {
				this.sounds.play('collect');
				// const [, iItem] = this.world.findNearestInRangeInteractableItem(mainCharacter.coords);
				// if (!iItem) return;
				// this.sounds.play('collect');
				// const messages = this.ItemClass.interact(iItem, mainCharacter, 1);
				// if (messages) this.interface.addToLog(messages);
				// this.setHeightToTerrain(iItem);
			}
		} else if (firstCommand === 'jump') {
			// const didJump = mainCharacter.jump();
			if (mainCharacter.grounded) this.sounds.play('jump');
		} else if (firstCommand === 'stop') {
			this.mainCharacter.vel = [0, 0, 0];
			// This is a hack to stop a key-stuck bug
			this.kbCommander.keysDown = {};
			this.kbCommander.commandsDown = {};
		}
	}

	// TODO: Move to SimWorld?
	setHeightToTerrain(entity) {
		const [x, y, z] = entity.coords;
		let h = this.world.terrainGen.getTerrainHeight(x, y);
		h += (entity.heightSizeOffset * entity.size);
		const grounded = (z <= h + 1);
		// have a small offset of h (+1) so things aren't in the air going from one tiny bump downwards
		if (grounded && !entity.grounded && entity.isCharacter) this.sounds.play('footsteps');
		// TODO: play 'land' sound instead if velocity downward is high
		entity.setGrounded(grounded, h);
	}

	checkWin() {
		const win = this.timeMachine.damage === 0;
		if (win) this.transition('win');
		return win;
	}

	checkDead() {
		const dead = this.mainCharacter.health.atMin();
		if (dead) this.transition('dead');
		return dead;
	}

	checkEncounter(t) {
		const { mainCharacter, world } = this;
		const damagingActors = world.actors.filter((actor) => {
			const dist = ArrayCoords.getDistance(mainCharacter.coords, actor.coords);
			const inDamageRange = dist <= actor.damageRange;
			return (!actor.isCharacter && inDamageRange);
		});
		damagingActors.forEach((actor) => {
			const dmg = actor.getDamage() * (t / 1000);
			mainCharacter.health.subtract(dmg);
		});
	}

	gameTick(t) {
		super.gameTick(t);

		if (this.checkWin()) return { terrainChunks: [] };
		this.checkDead();

		if (this.tick % 300 === 0 && this.spawnDinos) {
			// this.world.addNewDino(this.mainCharacter.coords);
		}

		// Handle camera position
		const zoom = this.mouseWheelWatcher.percent * 100;
		this.mouseWheelWatcher.update();
		this.cameraPosition[Z] = 35 + (zoom ** 2);
		// this.cameraPosition[Y] = -100 - zoom;

		// Handle commands being held down
		this.handleCommandsDown(this.kbCommander.getCommandsDown(), t);

		// Generate terrain -  // TODO: move to SimWorld
		const { mainCharacter, world } = this;
		const chunkRadius = Math.min(0 + Math.floor(this.tick / 70), 3);
		const terrainChunks = this.world.terrainGen.makeTerrainChunks(mainCharacter.coords, chunkRadius);
		// Update actors
		// TODO: Move to SimWorld
		world.actors.forEach((actor) => this.setHeightToTerrain(actor));
		// Clean items and actors to remove missing/dead
		world.despawn(mainCharacter.coords); // TODO: move to SimWorld

		this.checkEncounter(t);

		if (this.tick % 60 === 0) {
			// TODO: replenish cache if user hits F
			this.scanResults = this.calcScannableItems();
		}
		const { scanResults } = this;

		return { terrainChunks, scanResults };
	}

	calcScannableItems() {
		const { coords, facing } = this.mainCharacter;
		// Return between -PI and +PI
		const fixAngle = (radians) => {
			const fix = radians % TWO_PI;
			if (fix < -PI) return fix + TWO_PI;
			if (fix > PI) return fix - TWO_PI;
			return fix;
		};
		// const fixedFacing = fixAngle(facing);
		const MAX_SCAN = 5000;
		return this.world.items
			.filter((item) => item.scannable)
			.map((item) => {
				const distance = ArrayCoords.getDistance(coords, item.coords);
				const angle = ArrayCoords.getAngleFacing(coords, item.coords);
				// const fixedAngle = fixAngle(angle);
				const sortAngle = fixAngle(facing - angle);
				const percent = Math.max(1 - (distance / MAX_SCAN), 0);
				const absAngle = Math.abs(sortAngle);
				const behind = absAngle > HALF_PI;
				const front = absAngle < 0.4; // close to 1/8 PI
				return { item, distance, angle, sortAngle, facing, percent, behind, front };
			})
			.sort((a, b) => (a.sortAngle - b.sortAngle));
	}

	assembleRenderData(gameTickData = {}) { // You should overwrite this method
		const { terrainChunks, scanResults } = gameTickData;
		// Assemble data needed to render
		const {
			cameraPosition,
			cameraVerticalRotation,
			mainCharacter,
		} = this;
		const [x, y, z] = mainCharacter.coords;
		const [, iItem] = this.world.findNearestInRangeInteractableItem(mainCharacter.coords);
		const { sunLightAngle } = this.world.getSun();
		const entities = [...this.world.actors, ...this.world.items];
		const sceneUpdateOptions = {
			terrainChunks,
			// cameraPosition: [-(zoom ** 1.5), -zoom / 2, 30 + (zoom ** 2)],
			cameraPosition,
			cameraRotationGoalArray: [cameraVerticalRotation, 0, mainCharacter.facing - HALF_PI],
			worldCoords: [-x, -y, -z],
			entities,
			// skyColor: [0.5, 0.75, 1],
			skyColor: '#111717', // SKY_COLOR_PER_HOUR[this.world.getHour()],
			fogColor: '#171f1f',
			sunLightAngle,
		};
		const { inventory } = mainCharacter;
		const worldTimeArray = [this.world.getHour(), this.world.getMinutes()];
		const interfaceUpdates = {
			actor: mainCharacter,
			item: iItem,
			scanResults,
			inventory,
			debug: (this.testMode) ? {
				lastDeltaT: this.lastDeltaT,
			} : null,
			worldTimeArray,
		};
		return {
			sceneUpdateOptions,
			interfaceUpdates,
		};
	}

	buildWorld() {
		this.world.build(this.mainCharacter.coords);
		this.world.items.forEach((item) => {
			if (item.rooted) {
				this.setHeightToTerrain(item);
			}
			if (item.isTimeMachine) this.timeMachine = item;
		});
	}

	async setup() {
		
		const { spirit } = this.addNewPlayer();
		this.mainCharacter = this.world.addNewCharacter({
			spirit,
			inventorySize: this.world.getTotalParts(),
			coords: [0, 0, 0],
			// walkForce: 1000,
			// jumpForce: 1000 * 20,
		});
		this.buildWorld();
		const { gameScene } = this;
		await gameScene.setup([0, 100, 100]);
		this.world.debugScene = gameScene.worldGroup; // For debugging only
		this.world.setup();
	}

	setupMouseMove() {
		this.mouseHandler = ({ x, y }) => {
			this.mainCharacter.turn(-x * 0.001);
			// this.cameraPosition[X] += x * 1;
			// this.cameraPosition[Y] += y * 1;
			this.cameraVerticalRotation += y * -0.001;
		};
		this.pointerLocker
			.setup({ selector: '#hud' }) // Needs to happen after the canvas is created
			.on('lockedMouseMove', this.mouseHandler);
	}

	cleanUpMouseMove() {
		this.pointerLocker.unlock();
		this.pointerLocker.off('lockedMouseMove', this.mouseHandler);
	}

	toggleSoundBasedOnCheckboxes() {
		const musicCheckbox = DinoInterface.$('#music-checkbox');
		const soundCheckbox = DinoInterface.$('#sound-fx-checkbox');
		this.sounds.turnMusicOn(musicCheckbox.checked);
		this.sounds.turnSoundsOn(soundCheckbox.checked);
	}

	setupMainMenuEvents() {
		this.startButtonHandler = () => {
			this.transition('intro');
		};
		DinoInterface.$('#start-game-button').addEventListener('click', this.startButtonHandler);
		const musicCheckbox = DinoInterface.$('#music-checkbox');
		this.toggleSoundListener = () => this.toggleSoundBasedOnCheckboxes();
		musicCheckbox.addEventListener('change', this.toggleSoundListener);
		const soundCheckbox = DinoInterface.$('#sound-fx-checkbox');
		soundCheckbox.addEventListener('change', this.toggleSoundListener);
	}

	cleanUpMainMenuEvents() {
		DinoInterface.$('#start-game-button').removeEventListener('click', this.startButtonHandler);
		DinoInterface.$('#music-checkbox').removeEventListener('change', this.toggleSoundListener);
		DinoInterface.$('#sound-fx-checkbox').removeEventListener('change', this.toggleSoundListener);
	}

	async start() {
		await this.transition('loading');
		await this.transition('mainMenu');
		// this.transition('intro');
		// await this.transition('explore');

		// await this.transition('win');
		// gameScene.addBox();
		// gameScene.addBox();
		// await gameScene.addTerrainByHeightMap('BritanniaHeightMap2.jpg');

		// this.addNewDino();
		// this.addNewDino();

		// const testDino = this.addNewDino();
		// // testDino.autonomous = true;
		// testDino.mobile = false;
		// testDino.coords = [200, 0, 40];
		// // testDino.physics = false;
		// testDino.setFacing(0);
		// window.d = testDino;

		// this.startAnimationGameLoop();
	}
}

window.ArrayCoords = ArrayCoords;

export default DinoGame;
