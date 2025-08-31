/**
 * Singleton stores and retrieves data from indexeddb or localstorage to prevent unecesary calls to the server
 * Script Includes are stored on indexeddb, script include hash map is stored on localstorage
 * @class
 */

class CacheManager {
  /** @type {string} version of the application*/
  static #version = (function () {
    try {
      return __VERSION__;
    } catch (e) {
      return "1.0.0";
    }
  })();
  /** @type {string} max time until the cache is considered stale */
  static #maxCacheTime = 1000 * 60 * 60;

  /**@type {?Error} if not null, the connection to indexeddb failed*/
  #dbError = null;

  /**@type {?IDBDatabase} if null indexeddb is not opened yet or it failed */
  #snBlameDB;

  constructor() {
    if (typeof CacheManager.instance === "object") return CacheManager.instance;

    CacheManager.instance = this;
    return this;
  }

  /**
   * opens the connection to the indexeddb and manages the onupgradeneeded event
   * @returns {Promise} when resolved the singleton will have opened the conection to the indexeddb
   */
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

  /**
   * gets all sript include sys_id stored on the IDBDatabase for the IDBObjectStore sys_script_include
   * @returns {Promise} resolves to the list of sys_id of all the script includes cached
   */
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

  /**
   * Deletes the script include with given sys_id from the IDBObjectStore sys_script_include
   * @param {String} sys_id 
   * @returns {Promise} resolves when the delete transaction is executed correctly can reject the promise on delete error
   */
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

  /**
   * returns the cached script include for the given sys_id 
   * @param {String} sys_id 
   * @returns {Promise} resolves to the script include cached for the given sys_id or to null if the record does not exist or can not be retrieved
   */
  getScriptIncludeCache(sys_id) {
    return new Promise((resolve, reject) => {
      if(this.#dbError || !sys_id){
        resolve(null)
        return 
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'])
      dbTransaction.onerror = reject;

      const scriptInculdeStore = dbTransaction.objectStore('sys_script_include');
      const dbrequest = scriptInculdeStore.get(sys_id)

      dbrequest.onerror = event => resolve(null);
      dbrequest.onsuccess = (event) => {
        let result = event.target.result
        if(!result){
          resolve(null)
          return;
        }

        const now = new Date().getTime();
        if (now - result.timestamp > CacheManager.#maxCacheTime){
          this.invalidateScriptIncludeCache(sys_id)
          resolve(null);
          return;
        }

        if(result.version !== CacheManager.#version){
          this.invalidateScriptIncludeCache(sys_id)
          resolve(null);
          return;
        }
        resolve(result)
      }
    })
  }

  /**
   * stored on the IDBObjectStore sys_script_include the given parsed and analized script include
   * 
   * @param {String} sys_id sys_id of the script to store
   * @param {Object} data metadata of the script include (sys_id, sys_updated_on, sys_mod_count, api_name, etc)
   * @param {Object} scriptIncludeDetails 
   * @returns {Promise} resolves and returns the isnerted record or resolves to null if the record was not inserted 
   */
  setScriptIncludeCache(sys_id, data, scriptIncludeDetails) {
    return new Promise((resolve, reject) => {
      if(this.#dbError){
        resolve(null)
        return 
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'], 'readwrite')
      dbTransaction.onerror = reject;

      const scriptInculdeStore = dbTransaction.objectStore('sys_script_include');
      const dbrequest = scriptInculdeStore.put({
        data,
        ...scriptIncludeDetails,
        timestamp: new Date().getTime(),
        version: CacheManager.#version,
      })

      dbrequest.onerror = () => resolve(null);
      dbrequest.onsuccess = (event) => {
        resolve(event.target.result)
      }
    })
  }

  /**
   * Clears the IDBObjectStore sys_script_include
   * @returns {Promise} resolve to a string if the IDBObjectStore sys_script_include is cleared or null on error
   */
  clearScriptIncludeCache(){
    return new Promise((resolve, reject) => {
      if(this.#dbError){
        resolve(null)
        return 
      }

      const dbTransaction = this.#snBlameDB.transaction(['sys_script_include'], 'readwrite')
      dbTransaction.onerror = () => resolve(null);

      const dbrequest = dbTransaction.objectStore("sys_script_include");
      dbrequest.clear();

      dbrequest.onerror = () => resolve(null)
      dbrequest.onsuccess = () => resolve('Cache cleared')      
    });
  }

  /**@typedef {import('../snRESTFactory.js').ServiceNowRESTFactory} ServiceNowRESTFactory */

  /**
   * checks all keys on the IDBObjectStore sys_script_include to and invalidates the ones where the sys_mod_count
   * and sys_updated_on does not match with what is stored on the IDBObjectStore
   * @param {ServiceNowRESTFactory} restFactory 
   * @returns 
   */
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

  /**
   * gets localstorage data for the given key (apends sn-blame- to all keys to avoid colision with SN localstorage)
   * @param {String} key 
   * @returns {?String} if not null or undefined the localstorage for the given key
   */
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

  /**
   * Stores on localstorage the data for the given key, it appends sn-blame to avid colisions with SN localstorage data, and
   * adds metadata to keep track of when the data was stored and for what version of the APP, so we can ignore it if the data is stale or no longer valid 
   * @param {String} key 
   * @param {Any} data 
   */
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
  
  /**
   * removes the localstorage data for the given key (apends sn-blame- to avoid colision with SN data)
   * @param {String} key 
   */
  static invalidateCache(key) {
    localStorage.removeItem(`sn-blame-${key}`);
  }
}

export default CacheManager;
