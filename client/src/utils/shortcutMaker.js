export default class shortcutMaker {
	#allowedKeys = {};
	#currentKeys = {};
	#cb;
	constructor(keys, cb) {
		keys.forEach((key, index, ref) => {
			if (index == ref.length - 1) return;
			const notOK = ['shift', 'alt', 'control'].some(
				item => item == key.toLowerCase()
			);
			if (!notOK) throw new Error('bad keys');
		});
		keys.forEach(
			key => (this.#allowedKeys[key.toLowerCase()] = key.toLowerCase())
		);
		console.log(cb);
		if (typeof cb !== 'function') throw new Error('error');
		this.#cb = cb;
	}

	onPress(key) {
		console.log(key);
		const k = key.toLowerCase();
		if (!this.#allowedKeys[k]) return;
		this.#currentKeys[k] = k;
		setTimeout(() => delete this.#currentKeys[k], 500);
		if (
			Object.keys(this.#allowedKeys).length ===
			Object.keys(this.#currentKeys).length
		) {
			this.#emptyCurrentKeys();
			this.#cb();
		}
	}

	#emptyCurrentKeys() {
		this.#currentKeys = {};
	}
}
