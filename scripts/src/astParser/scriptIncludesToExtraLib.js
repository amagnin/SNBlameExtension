import * as astring from 'astring';

/**
 *  returns simplified Script of the ServiceNow Script Include ig:
 *  Class snScriptInclude { 
 *      CONSTNAT: 'someValue';
 *      constructor(){} // initialize
 *      method1(){}
 *  }; 
 * 
 *  snScriptIclude.somekey = function(){}
 * 
 *  to load the library to monaco:
 *  let disposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(script with the class information)
 * 
 *  to remove the library from monaco:
 *  disposable.dispose()
 */

export default function getScriptIncludeLib(className, scriptIncludesObject){
    let classNames = Object.keys(scriptIncludesObject.classKeys).map(key=>{
        let keyValue = scriptIncludesObject.classKeys[key]

        if(keyValue?.type === 'ObjectExpression')
            return `${key} = ${astring.generate(keyValue.value)}`

        if(keyValue?.type)
            return

        if(key === 'initialize'){
            return `constructor(${keyValue.args.toString()}){}`
        }
        
        if(typeof keyValue === 'string')
            return `${key} = ${keyValue};`
            
        return `${key}(${keyValue?.args?.toString()}){}`
    }).join('\n            ');
    
   

    let objectKeys = Object.keys(scriptIncludesObject.keys).map((key => {
        let keyValue = scriptIncludesObject.keys[key];
         if(keyValue?.type === 'ObjectExpression')
            return `${className}.${key} = ${astring.generate(keyValue.value)}`

        if(keyValue?.type)
            return

        if(typeof keyValue === 'string')
            return `${className}.${key} = ${keyValue};`
        return `${className}.${key} = (${keyValue.args.toString()}){};`
    })).join('\n');
    Object.keys(scriptIncludesObject.keys);

    let lib = `class ${className} ${typeof scriptIncludesObject.extends === 'string'? `extends ${scriptIncludesObject.extends}` : '' } {
        ${classNames}
    }
    ${objectKeys}
    `
    lib
    return lib
};