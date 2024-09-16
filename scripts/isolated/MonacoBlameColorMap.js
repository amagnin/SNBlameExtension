class MonacoBlameColorMap {

	#colorMap = {};

	constructor(){

		if(typeof MonacoBlameColorMap.instance === 'object' )
			return MonacoBlameColorMap.instance;

		MonacoBlameColorMap.instance = this;
		return this;
	}

	getColor(id){
		if(this.#colorMap[id])
			return this.#colorMap[id];

		const hue = Math.floor(Math.random() * 256); 
		const sat = Math.floor(Math.random() * 61); 
		const lum = Math.floor(20 + (Math.random() * 31));

		this.#colorMap[id] = `hsl(${hue}, ${sat}%, ${lum}%)`;

		return this.#colorMap[id] 
	}

}