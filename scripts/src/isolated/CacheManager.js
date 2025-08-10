class CacheManager {
  static #version = (function(){ try { return __VERSION__ } catch(e){ return '1.0.0'}})();
  static #maxCacheTime = 1000 * 60 * 60;
  
  constructor(){
    if(typeof CacheManager.instance === 'object' )
			return CacheManager.instance;

		CacheManager.instance = this;

		return this;
  }

  static getAllBlameCacheKeys(){
     Object.keys(localStorage).filter(key => key.startsWith('sn-blame'))
  }

  static invalidateScriptIncludeCache(className) {
    localStorage.removeItem(`script-include-${className}`); 
  }

  static invalidateCache(key) {
    localStorage.removeItem(`sn-blame-${key}`);
  }

  static getScriptIncludeCache(className) {
    return CacheManager.getCache(`script-include-${className}`);
  }

  static setScriptIncludeCache(className, data) {
    return CacheManager.setCache(`script-include-${className}`, data);
  }

  static getCache(key) {
    let cache;
    
    try{
      cache = JSON.parse(localStorage.getItem(`sn-blame-${key}`));
    }catch(e){
      return null;
    }

    if (!cache) {
      return null;
    }

    const now = new Date().getTime();
    if (now - cache.timestamp > CacheManager.#maxCacheTime) {
      localStorage.removeItem(key);
      return null;
    }

    if (CacheManager.#version !== cache.version) {
      localStorage.removeItem(key);
      return null;
    }

    return cache.data;
  }

  static setCache(key, data) {
    const cache = {
      version: this.#version,
      timestamp: new Date().getTime(),
      data: data
    };

    localStorage.setItem(`sn-blame-${key}`, JSON.stringify(cache));
  }

  validateScriptIncludeCache(restFactory){
    if(!restFactory)
      return;

    Object.keys(localStorage).filter(key => key.startsWith('sn-blame-script-include-')).map((key) =>{
      let cache;
      try{
        cache = JSON.parse(localStorage.getItem(key));
      }catch(e){
        return null;
      }

      if(!cache)
        return;

      if(!batch[batch.length - 1] || batch[batch.length - 1].length > 100){
        batch.push([]);
      }

      batch[batch.length - 1].push({
        sys_id: cache.sys_id,
        name: cache.name,
        sys_updated_on: cache.sys_updated_on,
        sys_update_count: cache.sys_updated_count
      })

      return batch
    }, []).forEach((batch)=>{
      let filter = []
      let recordMap = {}
      
      batch.forEach((record)=> {
        filter.push(record.sys_id);
        recordMap[record.sys_id] = record;
      }, []).join(',');

      restFactory.getRecords('sys_script_includes', ['sys_id', 'name', 'sys_updated_on', 'sys_update_count'], 'sys_idIN' + filter.join(','), null).then((body)=>{
        body.result.forEach((record) =>{
          if(recordMap[record.sys_id].sys_updated_on !== record.sys_updated_on || recordMap[record.sys_id].sys_update_count !== record.sys_update_count)
            CacheManager.invalidateScriptIncludeCache(recordMap[record.sys_id].name)
        })
      }).catch((err)=>{
        batch.forEach(record => CacheManager.invalidateScriptIncludeCache(record.name));
      })
    })
  }

}

export default CacheManager;