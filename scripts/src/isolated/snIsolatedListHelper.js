import snRESTFactory from "./snRESTFactory.js";
import StaticCodeAnalisisUtil from "../astParser/StaticCodeAnalysisUtil.js";
import CacheManager from "./CacheManager.js";

/**
* @typedef {import('./snRESTFactory.js').ServiceNowRESTFactory} ServiceNowRESTFactory
*/

export default function(){
    let restFactory;
    let cacheManager;
    let staticCodeAnalisisUtil;

    const LISTENERS =  {
        'sn-list-helper': async (event) => {
            const {table, sysIDList, g_ck, field} = event.detail;
            let scriptList;
        
            if(!restFactory)
                restFactory = snRESTFactory(g_ck);

            if(!cacheManager)
                cacheManager = new CacheManager(snRESTFactory);

            if(!staticCodeAnalisisUtil){
                let values = await Promise.all([
                    restFactory.getScriptIncludeCache(),
                    restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`),
                    restFactory.getRecords('sys_scope', ['sys_id, scope'], null, 'sn-scope-cache') 
                ]);
               
                staticCodeAnalisisUtil = new StaticCodeAnalisisUtil(values[0]);
                staticCodeAnalisisUtil.setAvailableSNScopes(values[2].result)
                scriptList = values[1].result;
            }
            else{
                scriptList = (await restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`)).result;
            }

            let parsedScripts = scriptList.map((script => {
                if(script.sys_policy === 'protected' && !script[field])
                    return {
                      sys_id: script.sys_id,
                      displayName: script.sys_name || null,
                      scope: staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || script.sys_scope.value,
                      protected: true,
                    }

                let scriptInfo = staticCodeAnalisisUtil.runScriptAnalisis(script[field], staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || 'global');
                
                scriptInfo.sys_id = script.sys_id
                scriptInfo.displayName = script.sys_name || null
                scriptInfo.scope = staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || script.sys_scope.value
                scriptInfo.protected = false;
                
                if(script.sys_class_name === 'sys_script_include')
                  scriptInfo.scriptIncludesInfo = staticCodeAnalisisUtil.runScriptInlcudesAnalisis(script[field], staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || 'global') ;
                
                return scriptInfo
            }));

            let parsedScriptIncludes = {};

            let scriptIncludes = await Promise.all(parsedScripts.reduce((acc, script) => {
                if(!script.scriptIncludeCalls || script.scriptIncludeCalls.length === 0)
                    return acc;

                script.scriptIncludeCalls.forEach((scriptInclude) => {
                    if(!parsedScriptIncludes[scriptInclude.id]){
                        acc.push(restFactory.getScriptIncludes(scriptInclude.id));
                        parsedScriptIncludes[scriptInclude.id] = 'loading'
                    }
                });
                return acc;
            }, []));

            parsedScriptIncludes = scriptIncludes.reduce((acc, scriptInclude) => {
                if(scriptInclude?.result?.sys_id && scriptInclude?.result?.sys_policy === 'protected' && !scriptInclude?.result?.script){
                    acc[scriptInclude.result.sys_id] = 'protected'
                    return acc
                }

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