let SNRESTFactory = function (g_ck) {
    
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Accept", "application/json");
    headers.append("X-UserToken", g_ck);

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

    let getProperties = async function(name){

    }

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

    return {
        getVersions,
        getScriptIncludes,
        getProperties,
        getScriptIncludeCache,
    }
}
export default SNRESTFactory;