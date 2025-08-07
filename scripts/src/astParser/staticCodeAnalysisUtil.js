import runScriptIncludesCodeAnalisis from "./scriptIncludesStaticCodeAnalysis.js";
import getScriptIncludeLib from "./scriptIncludesToExtraLib.js";
import walkerFunctions from './walkerFunctions.js';

import * as acorn from 'acorn';
import * as acornLoose from 'acorn-loose';
import * as walk from 'acorn-walk';
import * as astring from 'astring';

/**
 * static code analysis utility class
 * 
 * @class
 */
class StaticCodeAnalisisUtil {
    #scriptIncludeCache = {};
    #availableScopes = [];
    #loadedLibraries = {};
    #allScopeMap = {};

    static ACORN_OPTIONS = {
        ecmaVersion: 'latest',
        locations: true,
    }

    constructor(scriptIncludeCache){
        this.#scriptIncludeCache = scriptIncludeCache.sys_script_include ? scriptIncludeCache.sys_script_include : scriptIncludeCache;

        this.#availableScopes = Object.keys(this.#scriptIncludeCache)
            .map(key => key.split('.')[0])
            .filter((value, index, self) => self.indexOf(value) === index);

        if(typeof StaticCodeAnalisisUtil.instance === 'object' )
            return StaticCodeAnalisisUtil.instance;

        StaticCodeAnalisisUtil.instance = this;
        return this;
    }

    /**
     * updates the scriptIncludeCache
     * 
     * @param {Object} scriptIncludeCache node to analyze
     * 
     */
    updateCache(scriptIncludeCache){
        this.#scriptIncludeCache = scriptIncludeCache.sys_script_include ? scriptIncludeCache.sys_script_include : scriptIncludeCache;

        this.#availableScopes = Object.keys(scriptIncludeCache)
            .map(key => key.split('.')[0])
            .filter((value, index, self) => self.indexOf(value) === index);
    }

    /**
     * returns the parsed script object if it was already parsed  
     * @param {string} className CLass name to get the script cache sys_id
     * @returns {Object} object containing class methods and static methods, and general information about the script
    */
    getScriptCacheSysID(className){
        return this.#scriptIncludeCache[className];
    }

    /**
     * returns the library of a class if it was already generated
     * 
     * @param {string} className class name to get the loaded libraries 
     * @returns {string} string of the lib to be loaded directly to monaco
     */
    getLoadedLibraries(className){
        return this.#loadedLibraries[className];
    }

    /**
     * TODO: cache invalidation mechanism (removed scirpt for now) 
     * stores the script includes object form the extension cache
     * 
     * @param {string} className CLass name to get the script cache sys_id
     * @returns {Object} object containing class methods and static methods, and general information about the script
     */
    async getScriptIncludeParsedCache(className){
        return null;
        return await new Promise((resolve, reject) => {
            (chrome || browser).storage.local.get(`scriptIncludeCache-${className}`, function (result) {
              if (result[`scriptIncludeCache-${className}`] === undefined) {
                resolve();
              } else {
                try{
                    resolve(JSON.parse(result[`scriptIncludeCache-${className}`]));
                }catch(e){
                    reject();
                }
              }
            });
        });
    }

    /**
     * TODO: cache invalidation mechanism (removed scirpt for now) 
     * saves the script include to the extension storage to REST calls for classes already parsed
     * 
     * @param {string} className 
     * @param {Object} scriptCache 
     */
    updateScriptIncludeParsedCache(className, scriptCache){
        return null
        (chrome || browser).storage.local.set({[`scriptIncludeCache-${className}`]: JSON.stringify(scriptCache)});
    }

    /**
     * Executes the script include parser and returns the libraries to be loaded on monaco for the intelisense
     * 
     * @param {string} scriptToParse scirpt include script as a string to parse
     * @param {string} className scirpt inlcudes name (className)
     * @param {string} currentScope scope where the script include is called from
     * @param {string} scriptIncludesScope socpe of the scirpt includes
     * @returns {string} script library string to load on monaco IDE
     */
    async runScriptIncludesCodeAnalisis(scriptToParse, className, currentScope, scriptIncludesScope){
        if(!this.#scriptIncludeCache[className]) return;

        if(this.#loadedLibraries[className]) return this.#loadedLibraries[className];

        let parsedScript = await this.getScriptIncludeParsedCache(className);
        if(parsedScript) return parsedScript;

        parsedScript = runScriptIncludesCodeAnalisis(scriptToParse, this.#scriptIncludeCache, currentScope, this.#availableScopes);
        let scriptExtends = [];

        let libs = Object.keys(parsedScript).map((className) => {
            let lib = getScriptIncludeLib(className, parsedScript[className]);
            let ext = parsedScript[className].extends;
            
            if (scriptIncludesScope)
            lib = `declare namespace ${scriptIncludesScope} { ${lib} }; ${(currentScope === scriptIncludesScope || !scriptIncludesScope || !currentScope) ? lib : ''}`;

            if(!ext)
                return lib;

            if(ext.split('.').length === 2)
                scriptExtends.push(ext);
            else
                scriptExtends.push(`${scriptIncludesScope}.${ext}`);

            return lib;
        });

        this.#loadedLibraries[className] = {parsedScript, libs};
        this.updateScriptIncludeParsedCache(className, {parsedScript, libs});

        return {parsedScript, libs, scriptExtends};
    }

    /**
     * returns an object with the information of the script, scirpt include calls (class calls), GlideRecord Calls (what tables are used), etc
     * 
     * @param {string} stringScript string script to analize
     * @param {string} scriptScope scope of the script to analize
     * @returns {Object} object contianing ifnormation of the script
     */
    runScriptAnalisis(stringScript, scriptScope){

        const getTableName = (node, astTree) => { 
            if(node.type === 'Literal')
                return node.value

            return {type : node.type, value: astring.generate(node)};
        }

        let scriptBody
        try {
            scriptBody = acorn.parse(stringScript, StaticCodeAnalisisUtil.ACORN_OPTIONS)
        }catch(e){
            scriptBody = acornLoose.parse(stringScript, StaticCodeAnalisisUtil.ACORN_OPTIONS)
        }

        let scriptObj = {
            glideRecord: [],
            scriptIncludeCalls:[],
        }

        let self = this;

        walk.simple(scriptBody, {
            VariableDeclarator(_node){
                let {tableNode, variable} = walkerFunctions.getGlideRecordFromDeclaration(_node) || {};
                if(tableNode && variable){
                    let table = getTableName(tableNode);
                    scriptObj.glideRecord.push({table, variable});
                }
            },
            AssignmentExpression(_node){
                let {tableNode, variable} = walkerFunctions.getGlideRecordFromAssignment(_node) || {};
                if(tableNode && variable){
                    let table = getTableName(tableNode);
                    scriptObj.glideRecord.push({table, variable});
                }
                
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeCache, scriptScope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptObj.scriptIncludeCalls.push(scirptInlcludes);
            },
            ExpressionStatement(_node){
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeCache, scriptScope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptObj.scriptIncludeCalls.push(scirptInlcludes);
            },
            WhileStatement(_node) {
                let glideRecord = walkerFunctions.checkNestedWhileRecord(_node, scriptObj);
                if (glideRecord) 
                    scriptObj.glideRecord.push(glideRecord);       
            },
            MemberExpression(_node) {
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeCache, scriptScope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptObj.scriptIncludeCalls.push(scirptInlcludes);
            },
        })

        return scriptObj;
    }

    runScriptInlcudesAnalisis(stringScript, scriptScope){
        return runScriptIncludesCodeAnalisis(stringScript, this.#scriptIncludeCache, scriptScope, this.#availableScopes)
    }

    /**
     * retrieves all the script include calls, and the method used if is a one liner ig: new global.AuthUtils().getAvailableLanguages();
     * 
     * @param {string} stringScript string of the scirpt to find scirpt include call isntantiation or calls
     * @param {stringScript} scope scope of the script
     * @returns list of script include calls (class calls)
     */
    findScriptIncludeCall(stringScript, scope){
        let scriptBody;
        let scriptIncludeCalls = [];
        let self = this;

        try {
            scriptBody = acorn.parse(stringScript, StaticCodeAnalisisUtil.ACORN_OPTIONS)
        }catch(e){
            scriptBody = acornLoose.parse(stringScript, StaticCodeAnalisisUtil.ACORN_OPTIONS)
        }
        
        walk.simple(scriptBody, {
            ExpressionStatement(_node){
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeCache, scope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptIncludeCalls.push(scirptInlcludes);
              },
            AssignmentExpression(_node){
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeCache, scope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptIncludeCalls.push(scirptInlcludes);
            },
            VariableDeclarator(_node){
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeCache, scope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptIncludeCalls.push(scirptInlcludes);
            },
            MemberExpression(_node) {
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeCache, scope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptIncludeCalls.push(scirptInlcludes);
            },
          })
        
          return scriptIncludeCalls;
    }

    /**
     * Stores the map for all the available scopes on the instance
     * @param {Object} records JSON of the sys_scope records, with the fields sys_id and scope 
     */
    setAvailableSNScopes(records){
        this.#allScopeMap = records.reduce((acc, record)=> {
            acc[record.sys_id] = record.scope;
            return acc
        }, this.#allScopeMap)
    }

    /**
     * returns the list of all the available scopes
     * @returns {Object} list of all the available scopes, with sys_id as key and scope name as value
     */
    getAvailableSNScopes(){
        return this.#allScopeMap;
    }

    /**
     * returns the scope 'name' of asociated to the sys_id
     * 
     * @param {string} id sys_id of the scope
     * @returns {string} scope
     */
    getScopeFromID(id){
        return this.#allScopeMap[id];
    }
}

export default StaticCodeAnalisisUtil;