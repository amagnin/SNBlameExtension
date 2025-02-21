import MonacoBlameGutterWrapper from "./MonacoBlameGutterWrapper.js";
import SNBlameOptions from "./SNBlameOptions.js";
import SNRESTFactory from "./SNRestFactory.js";

import StaticCodeAnalisisUtil from "../astParser/StaticCodeAnalysisUtil.js";

import patienceDiff from "../../libraries/patienceDiff.js";
import X2JS from "x2js";


export default function(){
    /** @type {Object} */
    let serverDiff = {};
    /** @type {boolean} */
    let loaded = false;

    /** @type {ServiceNowRESTFactory} */
    let restFactory;

    /** @type {StaticCodeAnalisisUtil}*/
    let staticCodeAnalisisUtil;

    /** 
     * @type {Object} 
     * @property focus {function} - function for the focus event, 
     * starts the blame when the page is in focus if was not started yet and the delayStart is false, for when the page is loaded out of focus
     * @property load {function} - function for the load event
     * @property sn-blame-init {function}
     * @property sn-blame-model-change {function}
     * @property sn-check-tokens {function}
     * @property sn-get-scirpt_include_cache {function}
    */
    const LISTENERS = {
    'focus' : ()=>{
        const delayStart = new SNBlameOptions().getOption('startOnAction')
        if(!delayStart && !loaded)
        window.dispatchEvent(new CustomEvent("sn-blame-start"));
    },
    'load': () => {
        let options = new SNBlameOptions();

        window.dispatchEvent(new CustomEvent("sn-blame-options", {detail: options.getAllOptions()}));
    },
    'sn-blame-init': (event) => {
        const { g_ck, table, sys_id, fields} = event.detail;
        restFactory = SNRESTFactory(g_ck);

        window.dispatchEvent(new CustomEvent("sn-get-scirpt_include_cache", {
        detail: {
            g_ck,
        },
        }));

        const ignoreTableList = new SNBlameOptions().getOption('ignoreTableList');
        if(ignoreTableList.indexOf(table) !== -1) return;

        getVersions(table, sys_id, Object.keys(fields)).then((versions) => {
        if(loaded === true) return;
        
        Object.keys(fields).forEach((field) => {
            let editorElement = document.querySelector(
            `[id='element.${fields[field].id}'] #debugContainer`
            );
            loaded = true;

            if(versions.length === 0){
            let warnDiv = document.createElement('DIV');
            warnDiv.innerText = 'SN BLAME: NO VERSIONS AVAILABLE, CAN\'T START BLAME';
            warnDiv.style.padding = '10px';
            warnDiv.style.backgroundColor = 'hsl(55deg 100% 12%)';
            warnDiv.style.margin = '10px';
            warnDiv.style.color = 'white';
            warnDiv.style.fontWeight = 'bold';
            
            editorElement.prepend(warnDiv);
            return;
            }

            const ignoreWhiteSpace = new SNBlameOptions().getOption("ignoreWhiteSpace");
            serverDiff[field] = getBlame(versions, field, ignoreWhiteSpace);
            let currentDiff = getDiffsWithCurrent(
            fields[field].lines,
            serverDiff[field],
            ignoreWhiteSpace
            );
            window.dispatchEvent(new CustomEvent("sn-blame-diff-update", {detail: {diff: currentDiff, field}}));

            const gutters = new MonacoBlameGutterWrapper()

            gutters.createGutter(field, editorElement, currentDiff);
            window.dispatchEvent(new CustomEvent("sn-blame-get-scroll-position", {detail: {field}}));
        });
        });
        
    },
    'sn-blame-model-change': (event) => {
        const { script, field } = event.detail;
        const lines = script.split("\n");
    
        const gutters = new MonacoBlameGutterWrapper();
        if (!gutters.gutterExists(field)) return;
    
        const ignoreWhiteSpace = new SNBlameOptions().getOption("ignoreWhiteSpace");
        const currentDiff = getDiffsWithCurrent(lines, serverDiff[field], ignoreWhiteSpace);
    
        window.dispatchEvent(new CustomEvent("sn-blame-diff-update", {detail: {diff: currentDiff, field}}));
        gutters.updateGutterLines(field, currentDiff);
    },
    'sn-check-lines': (event) => {
        const { lines, field, currentScope } = event.detail;

        lines.forEach((line) => {
        findScriptIncludeCall(line, currentScope)
        })
    },
    'sn-get-scirpt_include_cache': (event) => {
        if(typeof restFactory?.getScriptIncludeCache !== 'function'){
        restFactory = SNRESTFactory(event.detail.g_ck);
        }

        restFactory.getScriptIncludeCache().then((cache)=>{
        staticCodeAnalisisUtil = new StaticCodeAnalisisUtil(cache);
        
        window.dispatchEvent(new CustomEvent("sn-blame-trigger-full-script-intelisense"));
        });

    },
    'sn-check-full-script': (event) => {
        const {script, currentScope} = event.detail;
        
        findScriptIncludeCall(script, currentScope);
    },
    
    };

    Object.keys(LISTENERS).forEach((key) => {
    window.addEventListener(key, LISTENERS[key]);
    });

    /**
     * Calls snRESTFactory getVersions to retrive all versions form the given record
     * 
     * @param {string} table record table name
     * @param {string} sys_id record unique id (sys_id)
     * @param {Array<string>} scriptFields list of fields that renders using the monaco editor usualy fields of type script present on the form
     * @returns {Array<snVersions>}
     */
    async function getVersions(table, sys_id, scriptFields) {
    var parser = new X2JS();

    let body = await restFactory.getVersions(table, sys_id)
    if(!body) return;

    let result = body.result.map((b) => {
        let record = parser.xml2js(b.payload.value).record_update[table];
        let res = {};
        scriptFields.forEach((field) => {
        res[field] = record[field].split("\n");
        });
        res.sys_updated_by = record.sys_updated_by;
        res.sys_updated_on = record.sys_updated_on;
        res.sys_recorded_at = b.sys_recorded_at.value;
        res.reverted_from = b.reverted_from.value;
        res.sys_id = b.sys_id.value;
        res.state = b.state.value;
        res.source = b.source;

        return res;
    });

    /**
     * @typedef snVersions
     * @type {Object}
     * 
     * @property sys_updated_by {string} timestap last updated time usualy same as created time
     * @property sys_updated_on {string} timestap last updated time
     * @property sys_recorded_at {string} unix timestamp in HEX when the version was created
     * @property reverted_from {string} if the version was reverted sys_id of the version reverted to 
     * @property sys_id {string} unique identifier of the version
     * @property state {string} state of the version current|previous|reverted
     * @property source {string} sys_id of the source (update set or patch)
     */

    return removeReverted(
        result.sort(function (a, b) {
        return (
            Number("0x" + b.sys_recorded_at) - Number("0x" + a.sys_recorded_at)
        );
        })
    );
    }

    /**
     * removes the irelevant versions for the version list, Versions that don't apply to the bale due to being reverted to a previous update
     *  
     * @param {Array<snVersions>} versions List of servicenow record versions
     * @returns {snVersions} list of versions with out the versions to ignore due to revert actions
     */
    function removeReverted(versions) {
    var result = [];
    var next = null;

    versions.forEach(function (element) {
        if (next == null || next === element.sys_id) {
        result.push(element);
        next = element.reverted_from || null;
        return;
        }
    });

    return result.reverse();
    }

    /**
     * Generates the balme for the given version/field combo
     * 
     * @param {Array<snVersions>} versions list of versions to generate the blame from
     * @param {string} key fieldname for the blame
     * @param {boolean} ignoreWhiteSpace if true will ignore whitespaces when comparing lines
     * @returns {Array<BlameLine>} Array of lines with the infromation of the last user/update set/patch who changed the line
     */
    function getBlame(versions, key, ignoreWhiteSpace) {
    if (versions.length === 0) return [];

    const initialVersion = versions[0];

    var result = initialVersion[key].map(function (line, index) {
        return {
        index: index,
        line: ignoreWhiteSpace ? line.replace(/\s\s+/g, " ").trim() : line,
        author: versions[0].sys_updated_by,
        versionID: versions[0].sys_id,
        source: versions[0].source,
        date: versions[0].sys_updated_on,
        };
    });

    for (let i = 1; i < versions.length; i++) {
        let left = result.map(function (l) {
        return l.line;
        });
        const currentVersion = versions[i];

        let right = currentVersion[key];
        if (ignoreWhiteSpace)
        right = right.map(function (line) {
            return line.replace(/\s\s+/g, " ").trim();
        });

        let changes = patienceDiff(left, right, true);

        result = changes.lines
        .filter(function removeDeletion(diff) {
            return diff.bIndex !== -1;
        })
        .map(function (diff) {
            let resultIndex = diff.aIndex;
            let date = new Date(
            resultIndex === -1
                ? currentVersion.sys_updated_on
                : result[resultIndex].date
            );
            return {
            index: diff.bIndex,
            line: diff.line,
            author:
                resultIndex === -1
                ? currentVersion.sys_updated_by
                : result[resultIndex].author,
            versionID:
                resultIndex === -1
                ? currentVersion.sys_id
                : result[resultIndex].versionID,
            source:
                resultIndex === -1
                ? currentVersion.source
                : result[resultIndex].source,
            date: date.valueOf(),
            };
        });
    }

    return result.map(function (diff, index) {
        let res = {
        onlyWhiteSpace: diff.line.trim().length === 0,
        index: diff.index + 1,
        author: diff.author,
        versionID: diff.versionID,
        source: diff.source,
        date: diff.date,
        line: diff.line,
        sourceName: (diff.source.display_value || "[SN BLAME] Deleted").replace(
            "Update Set: ",
            ""
        ),
        updateSetNotFound: !diff.source.display_value,
        };

        return res;
    });
    }


    /**
     * Compares the calculated blame with the current changes to hide the line if the line was updated with local changes
     * 
     * @param {Array<string>} newModelValue Array of the lines with current value of the field
     * @param {Array<BlameLine>} serverValue Array of lines with the infromation of the last user/update set/patch who changed the line
     * @param {boolean} ignoreWhiteSpace if true will ignore whitespaces when comparing lines
     * @returns {Array<BlameLine>} Array of lines with the infromation of the last user/update set/patch who changed the line 
     */
    function getDiffsWithCurrent(newModelValue, serverValue, ignoreWhiteSpace) {
    var changes = patienceDiff(
        serverValue.map(function (diff) {
        if (ignoreWhiteSpace) return diff.line.replace(/\s\s+/g, " ").trim();
        return diff.line;
        }),
        ignoreWhiteSpace
        ? newModelValue.map(function (line) {
            return line.replace(/\s\s+/g, " ").trim();
            })
        : newModelValue,
        true
    );

    changes = changes.lines
        .filter(function removeDeletion(diff) {
        return diff.bIndex !== -1;
        })
        .map(function (diff) {
        let resultIndex = diff.aIndex;
        let result = {
            onlyWhiteSpace: diff.line.trim().length === 0,
            index: diff.bIndex + 1,
            line: diff.line,
            newModel: resultIndex === -1,
        };

        if (resultIndex !== -1) {
            result.author = serverValue[resultIndex].author;
            result.versionID = serverValue[resultIndex].versionID;
            result.source = serverValue[resultIndex].source;
            result.sourceName = serverValue[resultIndex].sourceName;
            result.date = serverValue[resultIndex].date;
        }

        return result;
        });

    return changes;
    }

    /**
     * gets the script inlcude with the given identifier form the server, and parses it to use it as monaco extra library
     *   
     * @param {string} identifier script include identifier {scope.classname}
     * @param {string} currentScope scope of the current record
     * 
     */
    async function triggerScriptIncludeLib(identifier, currentScope){
    if(staticCodeAnalisisUtil.getLoadedLibraries(identifier)) 
        return;

    if(!staticCodeAnalisisUtil.getScriptCacheSysID(identifier)) 
        return;

    let body = await restFactory.getScriptIncludes(staticCodeAnalisisUtil.getScriptCacheSysID(identifier))
    if(!body?.result?.script) return

    let scriptInclideScope = body.result.api_name.split('.')[0];
    let scriptIncludeObject = await staticCodeAnalisisUtil.runScriptIncludesCodeAnalisis(body.result.script, identifier, currentScope, scriptInclideScope);

    window.dispatchEvent(new CustomEvent("sn-load-library", {
        detail: {
        libs : scriptIncludeObject.libs,
        },
    }));

    scriptIncludeObject.scriptExtends.forEach((className) => 
        triggerScriptIncludeLib(className, className.split('.')[1] ? className.split('.')[0] : currentScope)
    );

    }

    /** 
     * finds script inclulde calls only on the current script (accepts malformed scripts) will add intelisense for the found script includes.
     * @param {string} scriptString script to parse and find script include calls
     * @param {string} scope current scope 
    */
    function findScriptIncludeCall(scriptString, scope){
        let scriptIncludeCalls = staticCodeAnalisisUtil.findScriptIncludeCall(scriptString, scope);
        scriptIncludeCalls.forEach(scriptIncludeCall => triggerScriptIncludeLib(scriptIncludeCall.scriptInclude, scope));
    }
}