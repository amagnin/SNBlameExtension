import snRESTFactory from "./snRESTFactory.js";
import StaticCodeAnalisisUtil from "../astParser/StaticCodeAnalysisUtil.js";
import CacheManager from "./CacheManager.js";

/**
* @typedef {import('./snRESTFactory.js').ServiceNowRESTFactory} ServiceNowRESTFactory
*/

export default function(){
    let restFactory;
    let staticCodeAnalisisUtil;
    const cacheManager = new CacheManager();

    const LISTENERS =  {
        'sn-list-helper': async (event) => {
            const {table, sysIDList, g_ck} = event.detail;
            let scriptList;
        
            if(!restFactory)
                restFactory = snRESTFactory(g_ck);

            if(!staticCodeAnalisisUtil){
                let values = await Promise.all([
                    restFactory.getScriptIncludeCache(),
                    /** add cache ?? */
                    restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`),
                    restFactory.getRecords('sys_scope', ['sys_id, scope']) 
                ]);
               
                staticCodeAnalisisUtil = new StaticCodeAnalisisUtil(values[0]);
                staticCodeAnalisisUtil.setAvailableSNScopes(values[2].result)
                scriptList = values[1].result;

            }
            else{
                /** add cache ?? */
                scriptList = (await restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`)).result;
            }

            let parsedScripts = scriptList.map((script => {
                let scriptInfo = staticCodeAnalisisUtil.runScriptAnalisis(script.script, staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || 'global');
                scriptInfo.sys_id = script.sys_id
                scriptInfo.displayName = script.sys_name || null
                scriptInfo.scope = staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || script.sys_scope.value
                return scriptInfo
            }));

            let parsedScriptIncludes = {}

            //not working as I expected, need to check later
            // parsedScripts = await Promise.all(parsedScripts.map(async (script) => {

            let scriptIncludes = await Promise.all(parsedScripts.reduce((acc, script) => {
                script.scriptIncludeCalls.forEach((scriptInclude) => {
                    if(!parsedScriptIncludes[scriptInclude.id]){
                        acc.push(restFactory.getScriptIncludes(scriptInclude.id));
                        parsedScriptIncludes[scriptInclude.id] = 'loading'
                    }
                });
                return acc;
            }, []));

            parsedScriptIncludes = scriptIncludes.reduce((acc, scriptInclude) => {
                if(scriptInclude?.result?.sys_id)
                    acc[scriptInclude.result.sys_id] = staticCodeAnalisisUtil.runScriptAnalisis(scriptInclude.result.script, scriptInclude.result.api_name.split('.')[0] || 'global');
            
                return acc;
            }, {});

            window.dispatchEvent(new CustomEvent('sn-list-helper-response', {
                detail: { parsedScripts , parsedScriptIncludes}
            }))
        },
    }

    Object.keys(LISTENERS).forEach((key) => {
        window.addEventListener(key, LISTENERS[key]);
    });

    window.dispatchEvent(new CustomEvent("sn-list-helper-start"));
}