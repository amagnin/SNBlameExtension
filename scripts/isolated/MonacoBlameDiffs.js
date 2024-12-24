class MonacoBlameDiffs {
    #fields = {};
    #options;

    constructor() {
		if(typeof MonacoBlameDiffs.instance === 'object' )
			return MonacoBlameDiffs.instance;

		MonacoBlameDiffs.instance = this;
    }
    
}