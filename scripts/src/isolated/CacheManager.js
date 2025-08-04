class CacheManager {
  #version = __VERSION__;
  #maxCacheTime = 1000 * 60 * 60;
  
  constructor(){
    if(typeof CacheManager.instance === 'object' )
			return CacheManager.instance;

		CacheManager.instance = this;
		return this;
  }

}

export default CacheManager;