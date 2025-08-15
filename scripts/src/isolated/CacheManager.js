class CacheManager {
  static #version = (function () {
    try {
      return __VERSION__;
    } catch (e) {
      return "1.0.0";
    }
  })();
  static #maxCacheTime = 1000 * 60 * 60;

  constructor() {
    if (typeof CacheManager.instance === "object") return CacheManager.instance;

    CacheManager.instance = this;

    return this;
  }

  static getAllBlameCacheKeys() {
    Object.keys(localStorage).filter((key) => key.startsWith("sn-blame"));
  }

  static invalidateScriptIncludeCache(sys_id) {
    CacheManager.invalidateCache(`script-include-${sys_id}`);
  }

  static invalidateCache(key) {
    localStorage.removeItem(`sn-blame-${key}`);
  }

  static getScriptIncludeCache(sys_id) {
    return CacheManager.getCache(`script-include-${sys_id}`)?.data;
  }

  static setScriptIncludeCache(sys_id, data, scriptIncludeDetails) {
    return CacheManager.setCache(`script-include-${sys_id}`, {
      data,
      ...scriptIncludeDetails,
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

    localStorage.setItem(`sn-blame-${key}`, JSON.stringify(cache));
  }

  validateScriptIncludeCache(restFactory) {
    if (!restFactory) return;

    Object.keys(localStorage)
      .filter((key) => key.startsWith("sn-blame-script-include-"))
      .reduce((batch, key) => {
        let cache;
        try {
          cache = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          return null;
        }

        if (!cache) return;

        if (!batch[batch.length - 1] || batch[batch.length - 1].length > 100) {
          batch.push([]);
        }

        batch[batch.length - 1].push({
          sys_id: cache?.data?.sys_id,
          name: cache?.data?.name,
          sys_updated_on: cache?.data?.sys_updated_on,
          sys_mod_count: cache?.data?.sys_mod_count,
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
                CacheManager.invalidateScriptIncludeCache(record.sys_id);
            });
          })
          .catch((err) => {
            batch.forEach((record) =>
              CacheManager.invalidateScriptIncludeCache(record.sys_id)
            );
          });
      });
  }
}

export default CacheManager;
