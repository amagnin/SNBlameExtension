/**
 * Servicenow REST factory  
 * @class
 * 
 * @param {string} g_ck ServiceNow user token to trigger the REST request
 * @returns {ServiceNowRESTFactory} funcitons for all REST calls performed by the extension to the ServiceNow instance
 */
let SNRESTFactory = function (g_ck) {
    
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
    let getScriptIncludes = async function(sys_id){
        
        const response = await fetch(
            `/api/now/table/sys_script_include/${sys_id}`, {
                method: "GET",
                headers,
            }
        );

        if (!response.ok) {
            return;
        }

        let body = await response.json();
        return body
    }

    /**
     * retrives the value of the system property
     * @param {string} name name of the system property
     * @returns {string} value of the  proeprty
     */
    let getProperties = async function(name){

    }

    /**
     * get Servicenow the script includes cache object
     * @returns {Object} script include cache object containing the scirpt name and sys_id as value pair
     */
    let getScriptIncludeCache = async function(){
        const response = await fetch(
            `/api/now/syntax_editor/cache/sys_script_include`, {
                method: "GET",
                headers,
            }
        );

        let body = await response.json();
        try{
            return JSON.parse(body.result.result);
        }catch(e){
            return {};
        }
    }

    /**
     *  @typedef ServiceNowRESTFactory
     *  @type {Object}
     *  @property getVersions {function}  
     *  @property getScriptIncludes {function}
     *  @property getProperties {function}
     *  @property getScriptIncludeCache {function}
     */


    return {
        getVersions,
        getScriptIncludes,
        getProperties,
        getScriptIncludeCache,
    }
}
export default SNRESTFactory;