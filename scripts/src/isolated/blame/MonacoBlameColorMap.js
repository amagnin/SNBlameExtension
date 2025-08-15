/**
 * Singleton managing gutter colors. keeps track of all colors used on the gutter.
 * And allows forms containing multiple monaco editor to have the same color on all versios (blame) 
 * @class
 */

class MonacoBlameColorMap {

	/** @type {Object}*/
	#colorMap = {};

	/** @constant {Array<String>}*/
	#colorDefaults = [
		'#015b57',
		'#1e3e00',
		'#621300',
		'#511458',
		'#022f73',
		'#004100',
		'#910053',
		'#380011',
		'#ba2b00',
		'#7b6601',
		'#2500c5',
		'#534200',
		'#581691',
		'#010019',
		'#585250',
	];

	/**@type {number}*/
	#index = 0; 

	constructor(){

		if(typeof MonacoBlameColorMap.instance === 'object' )
			return MonacoBlameColorMap.instance;

		MonacoBlameColorMap.instance = this;
		return this;
	}

	/** returns the colour matching the ID, first 15 color are harcoded to ensure suficient contrast between them,
	 * the rest are random
	 * 
	 * @param {string} id: id of the color to return. the ID is stored on #colorMap to return the same color on each ID
	 * 
	 * @returns {string}: hsl color to hsl(hue, sat%, lum%)
	*/
	getColor(id){
		if(this.#colorMap[id])
			return this.#colorMap[id];

		if(this.#index < this.#colorDefaults.length){
			this.#colorMap[id] = this.#colorDefaults[this.#index];
			this.#index++;
			return this.#colorMap[id];
		}

		const hue = Math.floor(Math.random() * 360); 
		const sat = Math.floor(Math.random() * 61); 
		const lum = Math.floor(20 + (Math.random() * 31));

		this.#colorMap[id] = `hsl(${hue}, ${sat}%, ${lum}%)`;

		return this.#colorMap[id];
	}

}

export default MonacoBlameColorMap;