export default snRESTFactory = function (g_ck) {

    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Accept", "application/json");
    headers.append("X-UserToken", g_ck);

    let getVersions = async function (table, sys_id) {
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
            console.log(response);
            return;
        }

        let body = await response.json();
        return body
    };

    let getScriptIncludes = async function(name){
        const queryParams = new URLSearchParams({
            sysparm_query: `api_name=${name}`,
        });

        const response = await fetch(
            `/api/now/table/sys_script_include?${queryParams}`, {
                method: "GET",
                headers,
            }
        );

        if (!response.ok) {
            console.log(response);
            return;
        }

        let body = await response.json();
        return body
    }

    let getProperties = async function(name){

    }

    return {
        getVersions,
        getScriptIncludes,
        getProperties,
    }
}