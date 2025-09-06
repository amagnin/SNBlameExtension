import * as astring from 'astring';

/**   
* @module scriptIncludesToExtraLib
* @see module:scriptIncludesStaticCodeAnalysis
*
* @exports getScriptIncludeLib
* @example
*  to load the library to monaco:  
*  let disposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(script with the class information) or we overwride:  
*  GlideEditorMonaco.prototype.addIntellisenseforScriptInclude  
*   
*  addIntellisenseforScriptInclude: loads and tracks scriptInclude Intelisense  
*  params {Array} response - [{  
*          Scope.ScriptInclude : {  
*                  sysId: "5ae68cb0eb4131007128a5fc5206fefc"  
*                  typeDefinitioN  
*              }  
*          }]  
*   
*  to remove the library from monaco:  
*  disposable.dispose()  
*/

/**
 *  returns simplified Script of the ServiceNow Script Include
 *  @example
 *  Class snScriptInclude {   
 *      CONSTANT: 'someValue';  
 *      constructor(){} //initialize  
 *      method1(){}
 *      static someStaticMember1 = function(){}  
 *      static someStaticMember2 = function(){}   
 *      static CONSTANT = 'literal' 
 *  };   
 *
 *  @param {String} className: className of the class to generate the lib
 *  @param {Object} scriptIncludesObject: Object generated with scriptIncludeStaticCodeAnalysis, 
 *  containing all the relevant information of the class to generate the library for the intelisense  
 */

const getScriptIncludeLib = function(className, scriptIncludesObject){
    const classObject = scriptIncludesObject;
    
    let classNames = Object.keys(classObject.methods).map(key=>{
        let keyValue = classObject.methods[key]

        if(keyValue?.type === 'ObjectExpression')
            return `${key} = ${keyValue.value}`

        if(keyValue?.type)
            return

        if(key === 'initialize'){
            return `constructor(${keyValue.args.toString()}){}`
        }
        
        if(typeof keyValue === 'string')
            return `${key} = '${keyValue}';`
            
        return `${key}(${keyValue?.args?.toString()}){}`
    }).join('\n            ');
    
   
    let objectKeys = Object.keys(classObject.static).map((key => {
        let keyValue = classObject.static[key];
         if(keyValue?.type === 'ObjectExpression')
            return `static ${key} = ${keyValue.value}`

        if(keyValue?.type)
            return

        if(typeof keyValue === 'string')
            return `static ${key} = '${keyValue}';`
        if(keyValue?.args)
            return `static ${key} = (${keyValue.args.toString()}){};`

    })).join('\n      ');

    let lib = `class ${className} ${typeof classObject.extends === 'string'? `extends ${classObject.extends}` : '' } {
        ${classNames}
        ${objectKeys}
    }
    `
    return lib
};

export default getScriptIncludeLib