import SNRESTFactory from "./SNRestFactory.js";
import StaticCodeAnalisisUtil from "../astParser/StaticCodeAnalysisUtil.js";

/**
* @typedef {import('./SNRestFactory.js').ServiceNowRESTFactory} ServiceNowRESTFactory
*/

export default function(){
    let restFactory;
    let staticCodeAnalisisUtil;
    const LISTENERS =  {
        'sn-list-helper': async (event) => {
            const {table, sysIDList, g_ck} = event.detail;
            let scriptList;
        
            if(!restFactory)
                restFactory = SNRESTFactory(g_ck);

            if(!staticCodeAnalisisUtil){
                let values = await Promise.all([
                    restFactory.getScriptIncludeCache(),
                    restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`), 
                ]);
                
                staticCodeAnalisisUtil = new StaticCodeAnalisisUtil(values[0]);
                scriptList = values[1].result;
            }
            else{
                scriptList = await restFactory.getRecords(table, null, `sys_idIN${sysIDList.join(',')}`).result;
            }

            let parsedScripts = scriptList.map((script => {
                let scriptInfo = staticCodeAnalisisUtil.runScriptAnalisis(script.script, 'global');
                scriptInfo.sys_id = script.sys_id
                scriptInfo.scope = script.sys_scope.value
                return 
            
            }));
            console.log(parsedScripts, null, 2);
                
        },
    }

    Object.keys(LISTENERS).forEach((key) => {
        window.addEventListener(key, LISTENERS[key]);
    });
}