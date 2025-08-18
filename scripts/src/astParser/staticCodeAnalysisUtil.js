import runScriptIncludeCodeParsing from "./scriptIncludesStaticCodeAnalysis.js";
import getScriptIncludeLib from "./scriptIncludesToExtraLib.js";
import walkerFunctions from './walkerFunctions.js';
import CacheManager from "../isolated/CacheManager.js";

import * as acorn from 'acorn';
import * as acornLoose from 'acorn-loose';
import * as walk from 'acorn-walk';
import * as astring from 'astring';
import * as config from '../../../config.json';

/**
 * static code analysis utility class
 * 
 * @class
 */
class StaticCodeAnalisisUtil {
    #scriptIncludeMap = {};
    #availableScopes = [];
    #loadedLibraries = {};
    #allScopeMap = {};

    #TABLE_CONFIG_MAP = config.default;

    static ACORN_OPTIONS = {
        ecmaVersion: 'latest',
        locations: true,
    }

    constructor(scriptIncludeMap){
        if(typeof StaticCodeAnalisisUtil.instance === 'object' )
            return StaticCodeAnalisisUtil.instance;

        this.#scriptIncludeMap = scriptIncludeMap.sys_script_include ? scriptIncludeMap.sys_script_include : scriptIncludeMap;
        // removing the prototype.js script include form the list
        if(this.#scriptIncludeMap['global.Class'])
            delete this.#scriptIncludeMap['global.Class'];

        this.#availableScopes = Object.keys(this.#scriptIncludeMap)
            .map(key => key.split('.')[0])
            .filter((value, index, self) => self.indexOf(value) === index);

        StaticCodeAnalisisUtil.instance = this;
        return this;
    }

    getTableRequiredField(tableName){
        if(!this.#TABLE_CONFIG_MAP[tableName])
            return [this.#TABLE_CONFIG_MAP.defaultFields];

        let dataFields = Object.keys(this.#TABLE_CONFIG_MAP[tableName].dataFields || {}) || [];

        return this.#TABLE_CONFIG_MAP.defaultFields.concat(dataFields).concat(this.#TABLE_CONFIG_MAP[tableName].scriptFields || []);
    }

    /**
     * updates the scriptIncludeMap
     * 
     * @param {Object} scriptIncludeMap node to analyze
     * 
     */
    updateScriptIncludeMap(scriptIncludeMap){
        this.#scriptIncludeMap = scriptIncludeMap.sys_script_include ? scriptIncludeMap.sys_script_include : scriptIncludeMap;

        this.#availableScopes = Object.keys(scriptIncludeMap)
            .map(key => key.split('.')[0])
            .filter((value, index, self) => self.indexOf(value) === index);

    }

    /**
     * returns the parsed script object if it was already parsed  
     * @param {string} className CLass name to get the script sys_id
     * @returns {Object} object containing class methods and static methods, and general information about the script
    */
    getScriptIncludeSysID(className){
        return this.#scriptIncludeMap[className];
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
     * Executes the script include parser and returns the libraries to be loaded on monaco for the intelisense
     * 
     * @param {string} scriptToParse script include script as a string to parse
     * @param {string} className script inlcudes name (className)
     * @param {string} currentScope scope where the script include is called from
     * @param {string} scriptIncludesScope socpe of the scirpt includes
     * @returns {string} script library string to load on monaco IDE
     */
    runScriptIncludesCodeAnalisis(scriptToParse, className, currentScope, scriptIncludesScope){
        if(!this.#scriptIncludeMap[className]) return;

        if(this.#loadedLibraries[className]) return this.#loadedLibraries[className];

        let parsedScript = runScriptIncludeCodeParsing(scriptToParse, this.#scriptIncludeMap, currentScope, this.#availableScopes);
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

        this.#loadedLibraries[className] = {parsedScript, libs, scriptExtends};

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
                
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeMap, scriptScope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptObj.scriptIncludeCalls.push(scirptInlcludes);
            },
            ExpressionStatement(_node){
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeMap, scriptScope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptObj.scriptIncludeCalls.push(scirptInlcludes);
            },
            WhileStatement(_node) {
                let glideRecord = walkerFunctions.checkNestedWhileRecord(_node, scriptObj);
                if (glideRecord) 
                    scriptObj.glideRecord.push(glideRecord);       
            },
            MemberExpression(_node) {
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeMap, scriptScope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptObj.scriptIncludeCalls.push(scirptInlcludes);
            },
        })

        return scriptObj;
    }

    runScriptInlcudesAnalisis(stringScript, scriptScope){
        return runScriptIncludeCodeParsing(stringScript, this.#scriptIncludeMap, scriptScope, this.#availableScopes)
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
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeMap, scope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptIncludeCalls.push(scirptInlcludes);
              },
            AssignmentExpression(_node){
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeMap, scope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptIncludeCalls.push(scirptInlcludes);
            },
            VariableDeclarator(_node){
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeMap, scope, self.#availableScopes);
                if(scirptInlcludes)
                    scriptIncludeCalls.push(scirptInlcludes);
            },
            MemberExpression(_node) {
                let scirptInlcludes = walkerFunctions.findScriptIncludeCalls(_node, self.#scriptIncludeMap, scope, self.#availableScopes);
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

      /**
   * gets the script inlcude with the given identifier form the server, and parses it to use it as monaco extra library
   *
   * @param {string} scriptIDList script include sys_id list
   * @param {string} currentScope scope of the current record
   *
   */
  async triggerScriptIncludeLib(scriptIDList, currentScope, restFactory, eventTriggerFN) {
    if (!scriptIDList || scriptIDList.length === 0) return;

    let scriptList = [];

    let notCachedScriptList = []
    scriptIDList.forEach(async (scriptID) => {
      let scriptCache = CacheManager.getScriptIncludeCache(scriptID)
      if(!scriptCache){
        notCachedScriptList.push(scriptID)
        return;
      }

      
      scriptList.concat(await this.triggerScriptAnalysisEvent(scriptCache, currentScope, restFactory, eventTriggerFN))
      if(typeof eventTriggerFN === 'function')
        eventTriggerFN(scriptCache, currentScope)

      scriptList.push(scriptCache)
    })

    if(notCachedScriptList.length === 0)
      return;
    
    let body = await restFactory.getRecords('sys_script_include', this.getTableRequiredField('sys_script_include'), `sys_idIN=${notCachedScriptList.join(',')}`);
    if (!body?.result) return;

    body.result.forEach(async scriptInclude => {
      if(scriptInclude.sys_policy === 'protected' && !scriptInclude.script)
        return;

      let scriptIncludeScope = scriptInclude.api_name.split(".")[0];
      let scriptIncludeObject =
        this.runScriptIncludesCodeAnalisis(
          scriptInclude.script,
          scriptInclude.api_name,
          currentScope || scriptIncludeScope,
          scriptIncludeScope
        );
    
      CacheManager.setScriptIncludeCache(scriptInclude.sys_id, scriptIncludeObject, {
            sys_id:  scriptInclude.sys_id,
            sys_mod_count: scriptInclude.sys_mod_count,
            sys_updated_on: scriptInclude.sys_updated_on,
          });

      scriptList = scriptList.concat(await this.triggerScriptAnalysisEvent(scriptIncludeObject, currentScope || scriptIncludeScope, restFactory, eventTriggerFN));
      if(typeof eventTriggerFN === 'function')
        eventTriggerFN(scriptIncludeObject, currentScope)

      scriptList.push(scriptIncludeObject)
    })

    return scriptList
  }

  async triggerScriptAnalysisEvent(scriptIncludeObject, currentScope, restFactory, eventTriggerFN){
    return await scriptIncludeObject.scriptExtends.forEach((className) =>
      this.triggerScriptIncludeLib(
        [this.getLoadedLibraries(className)],
        currentScope,
        restFactory, 
        eventTriggerFN
      )
    );
  }
}

export default StaticCodeAnalisisUtil;