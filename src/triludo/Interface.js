/* eslint-disable class-methods-use-this */

const SHOW_CLASS = 'ui-show';
const HIDE_CLASS = 'ui-hide';

class Interface {
	constructor() {
		this.borderSelector = '#hud';
	}

	static $(selector) {
		const elt = window.document.querySelector(selector);
		if (!elt) console.warn('Could not find', selector);
		return elt;
	}

	static setText(selector, text) {
		const elt = Interface.$(selector);
		if (elt.innerText === text) return;
		elt.innerText = text;
	}

	static setHtml(selector, html) {
		const elt = Interface.$(selector);
		if (elt.innerHTML === html) return;
		elt.innerHTML = html;
	}

	static show(selector) {
		const elt = Interface.$(selector);
		elt.classList.remove(HIDE_CLASS);
		elt.classList.add(SHOW_CLASS);
	}

	static hide(selector) {
		const elt = Interface.$(selector);
		elt.classList.remove(SHOW_CLASS);
		elt.classList.add(HIDE_CLASS);
	}

	static capitalize(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	static getItemName(item) {
		let n = Interface.capitalize(item.name) || 'Item';
		if (item.damage) n += ` - Damaged (${item.damage})`;
		return n;
	}

	show(selector) { Interface.show(selector); }

	hide(selector) { Interface.hide(selector); }

	showLoading() { Interface.show('#loading'); }

	hideLoading() { Interface.hide('#loading'); }

	showWin() { Interface.show('#win'); }

	hideWin() { Interface.hide('#win'); }

	showMainMenu() { Interface.show('#main-menu'); }

	hideMainMenu() { Interface.hide('#main-menu'); }

	showHud() { Interface.show('#hud'); }

	hideHud() { Interface.hide('#hud'); }

	showDead() { Interface.show('#dead'); }

	hideDead() { Interface.hide('#dead'); }

	addToLog(messages) {
		if (!messages || !messages.length) return;
		if (messages instanceof Array) this.log = this.log.concat(messages);
		else this.log.push(messages); // string hopefully
	}

	flashBorder(color = '#f00', duration = 1000) {
		const elt = Interface.$(this.borderSelector);
		const keyFrames = [ // Keyframes
			{ borderColor: color },
			{ borderColor: 'transparent' },
		];
		const keyFrameSettings = { duration, direction: 'alternate', easing: 'linear' };
		const effect = new KeyframeEffect(elt, keyFrames, keyFrameSettings);
		const animation = new Animation(effect, document.timeline);
		animation.play();
	}

	render() {
        // override this function
	}
}

export default Interface;
