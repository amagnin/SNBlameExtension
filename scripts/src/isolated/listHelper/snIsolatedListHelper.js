import snRESTFactory from "../snRESTFactory.js";
import StaticCodeAnalisisUtil from "../../astParser/staticCodeAnalysisUtil.js";
import * as tableConfig from "../../../../snTableConfigurations.json"

/**
* @typedef {import('../snRESTFactory.js').ServiceNowRESTFactory} ServiceNowRESTFactory
*/

/**@type {ServiceNowRESTFactory}*/
let restFactory;

/**@type {StaticCodeAnalisisUtil} */
let staticCodeAnalisisUtil;
let tableConfiguration = tableConfig.default;

/**
 * @typedef parsedScript
 * @type {Object}
 * @property glideRecord: {Object} 
 * @property scriptIncludeCalls: {Object} 
 * @property scriptIncludesInfo: {Object} 
 * @property scope: {?string}
 * @property sys_id: {string} 
 * @property sys_updated_on: {Date} 
 * @property sys_mod_count: {number} 
 * @property sys_policy: {?string}
 * @property updateSetNotFound: {boolean}
 */

/**
 * @typedef parsedScriptIncludes
 * @type {Object<API_NAME, parsedScriptInclude>}
 */

/**
 * @typedef parsedScriptInclude
 * @type {Object}
 * @property static {Object}
 * @property methods {Object}
 * @property extends ${?string}
 */

/** 
 * @module snIsolatedListHelper
 * 
 * @listens sn-list-helper
 * @fires sn-list-helper-response
 */

/**
 * Retrieves the scripts to analize, and the script includes that are being used, and fires the sn-list-helper-response with all the parsed data
 * @fires sn-list-helper-response
 * 
 * @param {String} table table of the list to analize
 * @param {Array<String>} sysIDList list of sys_ids to analize
 * @param {Array<String>} field script field to analize
 * @param {String} g_ck servicenow token to performe REST calls 
 * @returns 
 */
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

const getExtendedScriptIncludes = async function (sysIDList, dept = 1) {
  if(sysIDList.length === 0)
    return []
  let parsedScriptIncludes =
    await staticCodeAnalisisUtil.triggerScriptIncludeLib(sysIDList, null, restFactory, null);

  if (dept > 3) 
    return parsedScriptIncludes || [];

  let scriptIDs = parsedScriptIncludes.map((s) => s.sys_id);
  let extendsIDs = parsedScriptIncludes
    .map((e) => e.scriptExtends)
    .flat()
    .filter((e) => e)
    .map((e) => staticCodeAnalisisUtil.getScriptIncludeSysID(e))
    .filter((e) => scriptIDs.indexOf(e) === -1);

   if(!extendsIDs || extendsIDs.length === 0)
    return parsedScriptIncludes || [];

   return parsedScriptIncludes.concat(await getExtendedScriptIncludes(extendsIDs, dept++))
};

export default function(){
    const LISTENERS =  {
        'sn-list-helper': async (event) => {
            const {table, sysIDList, g_ck, field} = event.detail;
            
            let parsedScripts = await getListData(table, sysIDList, field, g_ck)
            let parsedScriptIncludes = await staticCodeAnalisisUtil.triggerScriptIncludeLib(parsedScripts.map( script => script.scriptIncludeCalls)
                .flat(1)
                .map(scriptIncludesObj => scriptIncludesObj?.id)
                .filter((id, index, arr) => id && arr.indexOf(id) === index),
                null,
                restFactory,
                null
            );
            
            if(table === 'sys_script_include'){
                let scriptIDs = parsedScriptIncludes.map(s=> s.sys_id);
                let extendsIDs = parsedScriptIncludes.map(e=> e.scriptExtends)
                    .flat()
                    .filter(e=>e)
                    .map(e=> staticCodeAnalisisUtil.getScriptIncludeSysID(e))
                    .filter(e=> scriptIDs.indexOf(e) === -1 && e)

                let ExtendedClasses = await getExtendedScriptIncludes(extendsIDs);
                parsedScriptIncludes = parsedScriptIncludes.concat(ExtendedClasses);
            }
            
      
            window.dispatchEvent(new CustomEvent('sn-list-helper-response', {
                detail: { 
                    parsedScripts , 
                    parsedScriptIncludes: (parsedScriptIncludes || []).reduce(
                        (acc, scriptInclude) => {
                            Object.keys(scriptInclude.parsedScript).forEach(key => {
                                scriptInclude.parsedScript[key].sys_id = scriptInclude.sys_id
                                acc[`${scriptInclude.parsedScript[key].scope}.${key}`] = scriptInclude.parsedScript[key];
                            });
                            return acc
                        }, {}
                    )
                }
            }))
        },
    }

    Object.keys(LISTENERS).forEach((key) => {
        window.addEventListener(key, LISTENERS[key]);
    });
}