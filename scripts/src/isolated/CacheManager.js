class CacheManager {
  static #version = (function () {
    try {
      return __VERSION__;
    } catch (e) {
      return "1.0.0";
    }
  })();
  static #maxCacheTime = 1000 * 60 * 60;
  #dbError = null;
  #snBlameDB;

  constructor() {
    if (typeof CacheManager.instance === "object") return CacheManager.instance;

    CacheManager.instance = this;
    return this;
  }

  conectDB(){
    let self = this;

    return new Promise((resolve, reject) => {
        if(self.#snBlameDB)
          resolve(self)

        let dbOpenRequest = indexedDB.open('sn-blame-cache', 1);
        dbOpenRequest.onerror = (event) =>{
          self.#dbError = new Error('db not initialized');
          resolve(self);
        }

        dbOpenRequest.onsuccess = (event) => {
          this.#snBlameDB = dbOpenRequest.result;
          resolve(self);
        }

        dbOpenRequest.onupgradeneeded = (event) => {
          const blameDB =  event.target.result;
          blameDB.onerror = (event) => {
            console.log(event, blameDB, this.#snBlameDB);
          }

          const scriptIncludeStore = blameDB.createObjectStore("sys_script_include", {
            keyPath: 'sys_id',
            autoincrement: true,
          })

          scriptIncludeStore.createIndex('timestamp', "timestamp", {unique: false});
          scriptIncludeStore.createIndex('scope', "scope", {unique: false});
        }
     });
  }

  getAllBlameCacheKeys() {
    return new Promise((resolve, reject) => {
      if(this.#dbError){
        reject()
        return 
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'])
      dbTransaction.onerror = reject;

      const scriptInculdeStore = dbTransaction.objectStore('sys_script_include');
      const dbrequest = scriptInculdeStore.getAllKeys()

      dbrequest.onerror = reject;
      dbrequest.onsuccess = (event) => {
        resolve(event.target.result)
      }
    })
  }

  invalidateScriptIncludeCache(sys_id) {
    return new Promise((resolve, reject) => {
      if(this.#dbError){
        reject()
        return 
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'], "readwrite")
      dbTransaction.onerror = reject;

      const scriptInculdeStore = dbTransaction.objectStore('sys_script_include');
      const dbrequest = scriptInculdeStore.delete(sys_id);

      dbrequest.onerror = reject;
      dbrequest.onsuccess = (event) => {
        resolve(event.target.result)
      }
    })

  }

  getScriptIncludeCache(sys_id) {
    return new Promise((resolve, reject) => {
      if(this.#dbError){
        reject()
        return 
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'])
      dbTransaction.onerror = reject;

      const scriptInculdeStore = dbTransaction.objectStore('sys_script_include');
      const dbrequest = scriptInculdeStore.get(sys_id)

      dbrequest.onerror = event => resolve();
      dbrequest.onsuccess = (event) => {
        let result = event.target.result
        if(!result){
          resolve()
          return;
        }

        const now = new Date().getTime();
        if (now - result.timestamp > CacheManager.#maxCacheTime){
          this.invalidateScriptIncludeCache(sys_id)
          resolve();
          return;
        }

        if(result.version !== CacheManager.#version){
          this.invalidateScriptIncludeCache(sys_id)
          resolve();
          return;
        }
        resolve(result)
      }
    })
  }

  setScriptIncludeCache(sys_id, data, scriptIncludeDetails) {
    return new Promise((resolve, reject) => {
      if(this.#dbError){
        reject()
        return 
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'], 'readwrite')
      dbTransaction.onerror = reject;

      const scriptInculdeStore = dbTransaction.objectStore('sys_script_include');
      const dbrequest = scriptInculdeStore.put({
        data,
        ...scriptIncludeDetails,
        cacheDate: new Date().getTime(),
        version: CacheManager.#version,
      })

      dbrequest.onerror = reject;
      dbrequest.onsuccess = (event) => {
        resolve(event.target.result)
      }
    })
  }

  async validateScriptIncludeCache(restFactory) {
    if (!restFactory) return;

    let keys = await new Promise((resolve, reject) => {
      if(this.#dbError){
        return []
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'])
      dbTransaction.onerror = (event) => {
        resolve([])
      };

      const scriptInculdeStore = dbTransaction.objectStore('sys_script_include');
      const dbrequest = scriptInculdeStore.getAll()

      dbrequest.onerror = (event) => {
        resolve([])
      };
      dbrequest.onsuccess = (event) => {
        resolve(event.target.result)
      }
    });

    keys.reduce((batch, scriptInclude) => {
        if (!batch[batch.length - 1] || batch[batch.length - 1].length > 100) {
          batch.push([]);
        }

        batch[batch.length - 1].push({
          sys_id: scriptInclude.sys_id,
          name: scriptInclude.name,
          sys_updated_on: scriptInclude.sys_updated_on,
          sys_mod_count: scriptInclude.sys_mod_count,
        });

        return batch;
      }, [])
      .forEach((batch) => {
        let filter = [];
        let recordMap = {};

        batch
          .forEach((record) => {
            filter.push(record.sys_id);
            recordMap[record.sys_id] = record;
          })

        restFactory
          .getRecords( "sys_script_include", ["sys_id", "sys_updated_on", "sys_mod_count"], "sys_idIN" + filter.join(","))
          .then((body) => {
            (body?.result || []).forEach((record) => {
              if (
                recordMap[record.sys_id].sys_updated_on !== record.sys_updated_on ||
                recordMap[record.sys_id].sys_mod_count !== record.sys_mod_count
              )
                this.invalidateScriptIncludeCache(record.sys_id);
            });
          })
          .catch((err) => {
            batch.forEach((record) =>
              this.invalidateScriptIncludeCache(record.sys_id)
            );
          });
      });
  }

  static getCache(key) {
    let cache;

    try {
      cache = JSON.parse(localStorage.getItem(`sn-blame-${key}`));
    } catch (e) {
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
      data: data,
    };

    try{
      localStorage.setItem(`sn-blame-${key}`, JSON.stringify(cache));
    } catch (e) {  
      console.log('Quota exceeded!'); //data wasn't successfully saved due to quota exceed so throw an error
    }
  }
  
  static invalidateCache(key) {
    localStorage.removeItem(`sn-blame-${key}`);
  }
}

export default CacheManager;
