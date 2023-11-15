import { SoundController } from 'sound-controller';

class DinoSoundController extends SoundController {
	constructor(soundsListing = {}, musicListing = {}) {
		super(soundsListing, musicListing);
	}
}

export default DinoSoundController;
