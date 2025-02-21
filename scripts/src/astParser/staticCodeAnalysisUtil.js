import runScriptIncludesCodeAnalisis from "./scriptIncludesStaticCodeAnalysis.js";
import getScriptIncludeLib from "./scriptIncludesToExtraLib.js";
import walkerFunctions from './walkerFunctions.js';

import * as acorn from 'acorn';
import * as acornLoose from 'acorn-loose';
import * as walk from 'acorn-walk';

/**
 * static code analysis utility class
 * 
 * @class
 */
class StaticCodeAnalisisUtil {
    #scriptIncludeCache = {};
    #availableScopes = [];
    #loadedLibraries = {};

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
     * @param {string} className CLass name to get the script cache sys_id
    */
    getScriptCacheSysID(className){
        return this.#scriptIncludeCache[className];
    }

    /**
     * 
     * @param {string} className class name to get the loaded libraries 
     * @returns 
     */
    getLoadedLibraries(className){
        return this.#loadedLibraries[className];
    }

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

    updateScriptIncludeParsedCache(className, scriptCache){
        (chrome || browser).storage.local.set({[`scriptIncludeCache-${className}`]: JSON.stringify(scriptCache)});
    }

    async runScriptIncludesCodeAnalisis(scriptToParse, className, currentScope, scriptInclideScope){
        if(!this.#scriptIncludeCache[className]) return;

        if(this.#loadedLibraries[className]) return this.#loadedLibraries[className];

        let parsedScript = await this.getScriptIncludeParsedCache(className);
        if(parsedScript) return parsedScript;

        parsedScript = runScriptIncludesCodeAnalisis(scriptToParse, this.#scriptIncludeCache, currentScope, this.#availableScopes);
        let scriptExtends = [];

        let libs = Object.keys(parsedScript).map((className) => {
            let lib = getScriptIncludeLib(className, parsedScript[className]);
            let ext = parsedScript[className].extends;
            
            if (scriptInclideScope)
            lib = `declare namespace ${scriptInclideScope} { ${lib} }; ${(currentScope === scriptInclideScope || !scriptInclideScope || !currentScope) ? lib : ''}`;

            if(!ext)
                return lib;

            if(ext.split('.').length === 2)
                scriptExtends.push(ext);
            else
                scriptExtends.push(`${scriptInclideScope}.${ext}`);

            return lib;
        });

        this.#loadedLibraries[className] = {parsedScript, libs};
        this.updateScriptIncludeParsedCache(className, {parsedScript, libs});

        return {parsedScript, libs, scriptExtends};
    }

    runScriptAnalisis(stringScript, scriptScope){

        const getTableName = (node, astTree) => { 
            if(node.type === 'Literal')
                return node.value

            return node;
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
        })

        return scriptObj;
    }

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
            }
          })
        
          return scriptIncludeCalls;
    }


}

export default StaticCodeAnalisisUtil;