import CacheManager from "./CacheManager.js";


/**
 *  @typedef ServiceNowRESTFactory
 *  @type {Object}
 *  @property getVersions {function} retrives the version for the record passed
 *  @property getScriptIncludes {function} retrieves the script include for the given sys_id
 *  @property getRecords {function} retrives the a list of records for the given table 
 *  @property getScope {function} retrives the scope record for the given sys_id
 *  @property getProperties {function} retrives the value of the system property
 *  @property getScriptIncludeCache {function} retrieves Servicenow the script includes cache object
 */

/**
 * Servicenow REST factory  
 * @class
 * 
 * @param {string} g_ck ServiceNow user token to trigger the REST request
 * @returns {ServiceNowRESTFactory} funcitons for all REST calls performed by the extension to the ServiceNow instance
 */

let snRESTFactory = function (g_ck) {
    
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Accept", "application/json");
    headers.append("X-UserToken", g_ck);

    /**
     * retrives the version for the record passed
     * 
     * @param {string} table table of the record
     * @param {string} sys_id sys_id of the record
     * @returns {Object} response as a JSON 
     */
    let getVersions = async function (table, sys_id) {
        const fields = [
            "payload",
            "sys_recorded_at",
            "reverted_from",
            "sys_id",
            "source",
            "state",
        ];

        const queryParams = new URLSearchParams({
            sysparm_display_value: "all",
            sysparm_fields: fields.join(","),
            sysparm_query: `name=${table}_${sys_id}^stateINcurrent,previous`,
        });

        const response = await fetch(
            `/api/now/table/sys_update_version?${queryParams}`, {
                method: "GET",
                headers,
            }
        );

        if (!response.ok) {
            return;
        }

        let body = await response.json();
        return body
    };

    /**
     * retrieves the script include for the given sys_id
     * 
     * @param {string} sys_id: sys_id of the script includes 
     * @returns {Object} response as a JSON 
     */
    let getScriptIncludes = async function(sys_id, ignoreCache){
        const response = await fetch(
            `/api/now/table/sys_script_include/${sys_id}?sysparm_fields=api_name,sys_id,script,name,sys_scope,active,sys_policy`, {
                method: "GET",
                headers,
            }
        );

        if (!response.ok) {
            return;
        }

        let body = await response.json();

        return body;
    }

    /**
     * Retrieves a list of records from the given table/filter combo
     * @param {string} table table name to retrieve the records from 
     * @param {?Array<string>} fields list of fields to retrieve
     * @param {?string} filter ServiceNow encoded query 
     * @returns {Object} response as a JSON 
     */
    let getRecords = async function(table, fields, filter, cacheKey){
        
        if(cacheKey){
            let cache  = CacheManager.getCache(cacheKey)
            if(cache)
                return cache;
        }

        const params = new URLSearchParams();
        if(fields)
            params.append('sysparm_fields', fields.join(','));
        if(filter)
            params.append('sysparm_query', filter);

        const response = await fetch(
            `/api/now/table/${table}?${params.toString()}`, {
                method: "GET",
                headers,
            }
        );

        if (!response.ok) {
            return;
        }

        let body = await response.json();
        if( body?.result?.length !== 0 && cacheKey)
            CacheManager.setCache(cacheKey, body);

        return body;
    }

    /**
     * retrieves the scope record
     * 
     * @param {string} sys_id: sys_id of the scope 
     * @returns {Object} response as a JSON 
     */
    let getScope = async function(sys_id){
        const response = await fetch(
            `/api/now/table/sys_scope/${sys_id}`, {
                method: "GET",
                headers,
            }
        );

        if (!response.ok) {
            return;
        }

        let body = await response.json();
        return body;
    }

    /**
     * retrives the value of the system property
     * @param {string} name name of the system property
     * @returns {string} value of the  proeprty
     */
    let getProperties = async function(name){
        const params = new URLSearchParams();
        if(name)
            params.append('sysparm_query', `name=${name}`);
            
        const response = await fetch(
            `/api/now/table/sys_properties?${params.toString()}`, {
                method: "GET",
                headers,
            }
        );

        if (!response.ok) {
            return;
        }

        return await response.json();
    }

    /**
     * get Servicenow the script includes cache object
     * @returns {Object} script include cache object containing the scirpt name and sys_id as value pair
     */
    let getScriptIncludeCache = async function(ignoreCache){
        if(!ignoreCache){
            let cache = CacheManager.getCache('script-includes-map');
            if(cache)
                return cache;
        }
        

        const response = await fetch(
            `/api/now/syntax_editor/cache/sys_script_include`, {
                method: "GET",
                headers,
            }
        );

        let body = await response.json();
        
        try{
            let result = JSON.parse(body.result.result);
            CacheManager.setCache('script-includes-map', result);
            return result
        }catch(e){
            return {};
        }
    }

    return {
        getVersions,
        getScriptIncludes,
        getRecords,
        getScope,
        getProperties,
        getScriptIncludeCache,
    }
}
export default snRESTFactory;