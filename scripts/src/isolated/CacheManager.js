class CacheManager {
  #version = __VERSION__;
  #maxCacheTime = 1000 * 60 * 60;
  
  constructor(){
    if(typeof CacheManager.instance === 'object' )
			return CacheManager.instance;

		CacheManager.instance = this;
		return this;
  }

  invalidateScriptIncludeCache(className) {
    localStorage.removeItem(`script-include-${className}`); 
  }

  invalidateCache(key) {
    localStorage.removeItem(`sn-blame-${key}`);
  }

  getScriptIncludeCache(className) {
    return this.getCache(`script-include-${className}`);
  }

  setScriptIncludeCache(className, data) {
    
    return this.setCache(`script-include-${className}`, data);
  }

  getCache(key) {
    const cache = JSON.parse(localStorage.getItem(`sn-blame-${key}`));
    if (!cache) {
      return null;
    }

    const now = new Date().getTime();
    if (now - cache.timestamp > this.#maxCacheTime) {
      localStorage.removeItem(key);
      return null;
    }

    if (this.#version !== cache.version) {
      localStorage.removeItem(key);
      return null;
    }

    return cache.data;
  }

  setCache(key, data) {
    const cache = {
      version: this.#version,
      timestamp: new Date().getTime(),
      data: data
    };

    localStorage.setItem(`sn-blame-${key}`, JSON.stringify(cache));
  }

}

export default CacheManager;