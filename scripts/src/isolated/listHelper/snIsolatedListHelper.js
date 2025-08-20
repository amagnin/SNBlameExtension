import snRESTFactory from "../snRESTFactory.js";
import StaticCodeAnalisisUtil from "../../astParser/StaticCodeAnalysisUtil.js";
import * as tableConfig from "../../../../snTableConfigurations.json"

/**
* @typedef {import('../snRESTFactory.js').ServiceNowRESTFactory} ServiceNowRESTFactory
*/

let restFactory;
let staticCodeAnalisisUtil;
let tableConfiguration = tableConfig.default;

let getListData = async function(table, sysIDList, field, g_ck){
    if(!restFactory)
        restFactory = snRESTFactory(g_ck);

    let scriptList;

    if(!staticCodeAnalisisUtil){
        let values = await Promise.all([
            restFactory.getScriptIncludeCache(),
            restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`),
            restFactory.getRecords('sys_scope', ['sys_id, scope'], null, 'sn-scope-cache') 
        ]);
        
        staticCodeAnalisisUtil = new StaticCodeAnalisisUtil(values[0]);
        staticCodeAnalisisUtil.setAvailableSNScopes(values[2].result);
        scriptList = values[1].result;
    }
    else{
        scriptList = (await restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`)).result;
    }

    let parsedScripts = scriptList.map((script => {
        let configurationFieldData = {}
        tableConfiguration.defaultFields.forEach(field => configurationFieldData[field] = script[field]?.value ? script[field].value : script[field])
        Object.keys(tableConfiguration[table].dataFields).forEach((field) => configurationFieldData[field] = script[field]?.value ? script[field].value : script[field])

        if(script.sys_policy === 'protected' && !script[field])
            return {
                displayName: script.sys_name || null,
                scope: staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || script.sys_scope.value,
                protected: true,
                ...configurationFieldData,
            }

        let scriptInfo = staticCodeAnalisisUtil.runScriptAnalisis(script[field], staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || 'global');
        
        scriptInfo.displayName = script.sys_name || null
        scriptInfo.scope = staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || script.sys_scope.value
        scriptInfo.protected = false;
        Object.assign(scriptInfo, configurationFieldData);
        
        if(script.sys_class_name === 'sys_script_include')
            scriptInfo.scriptIncludesInfo = staticCodeAnalisisUtil.runScriptInlcudesAnalisis(script[field], staticCodeAnalisisUtil.getScopeFromID(script.sys_scope.value) || 'global') ;
        
        return scriptInfo
    }));

    return parsedScripts;
}

export default function(){
    const LISTENERS =  {
        'sn-list-helper': async (event) => {
            const {table, sysIDList, g_ck, field} = event.detail;
            
            let parsedScripts = await getListData(table, sysIDList, field, g_ck)
            let parsedScriptIncludes = await staticCodeAnalisisUtil.triggerScriptIncludeLib(parsedScripts.map( script => script.scriptIncludeCalls)
                .flat(1)
                .filter( e=> !!e)
                .map(scriptIncludesObj => scriptIncludesObj.id)
                .filter((id, index, arr) => arr.indexOf(id) === index),
                null,
                restFactory,
                null
            ); 
      
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