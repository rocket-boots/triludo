const INTRO_TIME = 11000;

const states = {
	loading: {
		start: async (game) => {
			// Pre-load some music -- this doesn't seem to be working
			game.sounds.playMusic('panic').stop();
			game.sounds.playMusic('jazz').stop();
			// Since this is the start of the app running, we need to hide some things
			game.interface.hideWin();
			// await game.setup();
			// Note: The loading window is shown by default (last z-index in the page),
			// but we'll ensure it's being shown
			game.interface.showLoading();
		},
		stop: (game) => {
			game.interface.hideLoading();
		},
	},
	mainMenu: {
		keyboardMapping: {
			Enter: 'start',
		},
		async start(game) {
			game.sounds.playMusic('jazz').fade(0, 0.5, 4000);
			// game.interface.hideWin();
			game.interface.showMainMenu();
			game.interface.hide('#menu');
			game.interface.show('#main-menu-loading');
			game.toggleSoundBasedOnCheckboxes();
			game.setupMainMenuEvents();
			await game.setup();
			game.interface.hide('#main-menu-loading');
			game.interface.show('#menu');
			if (game.testMode) game.transition('explore'); // For testing
			else game.say([1000, 'Your time machine', 500, 'is ready.']);
		},
		stop(game) {
			game.interface.hideMainMenu();
			game.cleanUpMainMenuEvents();
		},
	},
	intro: {
		keyboardMapping: {
			Esc: 'exit', // TODO: make this work
			//
		},
		start(game) {
			const song = game.sounds.playMusic('panic');
			if (song) song.seek(65).fade(0, 0.75, 500);
			game.interface.show('#intro');
			game.say([
				100,
				'You enter your time machine', 300,
				'To go back and make things better', 400,
				'But something\'s gone wrong.', 400,
				'You\'re going too far back', 200,
				'and the machine rumbles',
			]);
			const waitTime = (game.testMode) ? 1000 : INTRO_TIME;
			setTimeout(() => game.transition('explore'), waitTime);
		},
		stop(game) {
			game.interface.hide('#intro');
			// If this state transitions too quick, it's possible the music never fades out
			// TODO: Move this fadeOut method into sound controller lib
			if (game.sounds.musicNowPlaying) game.sounds.musicNowPlaying.fade(0.75, 0, 5000);
			game.sounds.play('explode');
			game.sounds.play('explode', { delay: 1000 });
			game.sounds.play('explode', { delay: 2500 });
			game.sounds.play('scary');
			game.say([
				4000, 'Warning: The time machine has undergone rapid unscheduled disassembly.',
				5000, 'No casualties or injuries identified.',
				1000, 'Try moving around.',
				7000, 'Time sensors are offline. Cannot identify what year it is.',
				7000, 'Scanner functionality is nominal. Picking up signals from the time machine\'s missing parts.',
				5000, 'Warning: Leaving parts behind could have unintended consequences for the timeline\'s continuity.',
				10000, 'You should be able to re-build the time machine if you find enough parts.',
			]);
		},
	},
	explore: {
		keyboardMapping: {
			w: 'move forward',
			a: 'move left',
			s: 'move back',
			d: 'move right',
			// These causes a problem due to a bug in kb commander
			// W: 'move forward sprint',
			// A: 'move left sprint',
			// S: 'move back sprint',
			// D: 'move right sprint',
			z: 'turn left',
			x: 'turn right',
			e: 'interact nearest',
			' ': 'jump',
			Shift: 'sprint',
			Backspace: 'stop',
		},
		async start(game) {
			game.interface.showHud();
			game.setupMouseMove();
			game.startAnimationGameLoop();
			game.interface.addToLog([
				'It looks like your time machine broke apart, and pieces are strewn across this strange landscape.',
				'((Click screen to enable/disable mouse look))',
			]);
			game.sounds.playMusic('wandering');
		},
		stop(game) {
			game.interface.hideHud();
			game.stopAnimationGameLoop();
			game.cleanUpMouseMove();
		},
	},
	inventory: {
		// TBD
	},
	dead: {
		start(game) {
			game.sounds.play('scary');
			game.interface.showDead();
			setTimeout(() => {
				game.mainCharacter.coords = [0, 0, 0]; // eslint-disable-line no-param-reassign
				game.sounds.play('teleport');
				game.mainCharacter.health.add(1); // otherwise we'll end up back here
				game.transition('explore');
			}, 5000);
		},
		stop(game) {
			game.interface.hideDead();
		},
	},
	win: {
		start: async (game) => {
			game.say([
				'Time machine activated.', 100, 'Returning you to the future.',
			]);
			game.sounds.play('teleport');
			game.sounds.playMusic('home');
			game.interface.showWin();
		},
		stop: (game) => {
			game.interface.hideWin();
		},
	},
};

export default states;
