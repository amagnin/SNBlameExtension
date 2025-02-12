import * as astring from 'astring';
import * as walk from 'acorn-walk';

/**
 * @module walkerFunctions
 */

/**
 * returns true if the node is a call to GlideRecord().next() or GlideRecord()._next() function
 * 
 * @param {string} type :Node Type
 * @param {Object} node 
 * @return {string}
 */
const isGlideRecordNext = (type, node) => type === 'CallExpression' && /^(_){0,1}next/.test(node?.callee?.property?.name);

/**
 * Finds any method or constant added to the Instantiated Class by the constructor (initialize) 
 * 
 * @param {Object} _node: AST Node 
 * @returns undefined
 */
const getConstructorContextExpresions = function(_node){
    let left = _node.expression?.left;
    let right = _node.expression?.right;

    if(right?.type === 'FunctionExpression'){
        return {
            type: right.type,
            key: left.property.name,
            args: right.params.map(param => param.name), 
        }
    }

    if(left?.type === 'MemberExpression' && left?.object?.type === 'ThisExpression' && (right.value !== undefined || right.properties)){
        let typeofLiteral = right.value !== undefined ? typeof right.value : right.properties 
        return {
            type: right?.type,
            key: left.property.name, 
            value: right.value || right.properties,
        }
    }
};

/**
 * Finds GlideRecord and GlideRecordSecure initializations on variable declarations:
 * var grRecord = new GlideRecord('table'), and stores the info on the class and method
 *   
 * [{  
 *      table: String|AST Node - String if we can find the literal, otherwise the AST Node  
 *      variable: String - Variable Name  
 * }]  
 * 
 * @param {Object} _node: AST Node 
 * 
 */
const getGlideRecordFromDeclaration = function(_node){
    if(_node.init?.type === 'NewExpression' && (_node.init?.callee.name === 'GlideRecord' || _node.init?.callee.name === 'GlideRecordSecure')){
        return {tableNode: _node.init.arguments[0], variable: _node.id.name};
    }
};
/**
 * Finds GlideRecord and GlideRecordSecure initializations on variable assignment:
 * grRecord = new GlideRecord('table'), and stores the info on the class and method
 * 
 * [{  
 *      table: String|AST Node - String if we can find the literal, otherwise the AST Node  
 *      variable: String - Variable Name  
 * }]  
 * 
 * @param {Object} _node: AST Node 
 * 
 */
const getGlideRecordFromAssignment = function(_node){
    if(_node.right?.type === 'NewExpression' && (_node.right?.callee.name === 'GlideRecord' || _node.right?.callee.name === 'GlideRecordSecure')){
        return {tableNode: _node.right.arguments[0], variable: _node.left.name};
    }
};
/**
 * Find While statment used to loop over glideRecords and set the loop to true on the Object storing the GlideRecord information.
 * 
 * @param {Object} _node: AST Node
 * 
 */
const checkNestedWhileRecord = function(_node, classObject) {
    let glideRecord = walk.findNodeAt(_node.test, null, null, isGlideRecordNext)?.node;
    
    if (!glideRecord) 
        return;

    let grRecord = classObject.glideRecord.find(gr => gr.variable === glideRecord.callee.object.name);
    if(grRecord){
        /**TODO: Refactor */
        grRecord.loop = true;
        return ;
    } else
        return {table: null, variable: glideRecord, loop: true}
};

/**
 * removes all the content between parentesis including nested parentesis, up to 5 levels deep
 * @param {string} string 
 * @returns 
 */
const removeParentesis = function(string){
    let count = 0;
    while(string.indexOf('(') !== -1 && string.indexOf(')') !== -1 && count < 5){
        string = string.replace(/\([^()]*\)/g, '');
        count ++
    }

    return string
}

/**
 * returns the scriptInclude and method called on the node if it is a scriptInclude call
 * 
 * 
 * @typedef ScriptIncludesCall
 * @type {Object}
 * @property type: {string} node type where the scriptInclude was found
 * @property line: {number} line number where the scriptInclude was found
 * @property scriptInclude: {string} class name of the scriptInclude
 * @property id: {string} sys_id of the scriptInclude
 * @property method: {string} method called on the scriptInclude
 *
 * 
 * @param {Object} _node 
 * @param {Object} scriptIncludeCache 
 * @param {string} scriptScope 
 * @param {Array<string>} availableScopes 
 * @returns {ScriptIncludesCall}
 */
const findScriptIncludeCalls = function(_node, scriptIncludeCache, scriptScope, availableScopes){
       
    const IGNORE_EXPLICIT_NAMESPACE_SCRIPT_INCLUDES = ['JSON'];

    /** ig: 
     * new global.ChangeCheckConflictsSNC().getBoolPropertyValue()  
     * global.ChangeCheckConflictsSNC.getBoolPropertyValue() 
     * */
    if( _node.type === 'ExpressionStatement' && 
        _node.expression.type === 'CallExpression' && 
        _node.expression.callee.object?.type !== 'ThisExpression' && 
        _node.expression.callee.object?.object?.type !== 'ThisExpression'
    ){
        let nodeValue = removeParentesis(astring.generate(_node.expression)).split('.'); 
        
        if(_node.expression.callee.object?.type === 'NewExpression')
            nodeValue[0] =  removeParentesis(astring.generate(_node.expression.callee.object.callee)).split('.')[0];

        if(_node.expression.callee.type === 'NewExpression')
            nodeValue[0] =  removeParentesis(astring.generate(_node.expression.callee.object)).split('.')[0]; 

        if(availableScopes.indexOf(nodeValue[0]) !== -1){
            if(scriptIncludeCache[`${nodeValue[0]}.${nodeValue[1]}`]) 
                return {
                    type : 'ExpressionStatement',
                    line : _node.loc?.start?.line,
                    scriptInclude: `${nodeValue[0]}.${nodeValue[1]}`,
                    id: scriptIncludeCache[`${nodeValue[0]}.${nodeValue[1]}`],
                    method: nodeValue[2] ? nodeValue[2] : null
                } 
        }else{
            if(scriptIncludeCache[`${scriptScope}.${nodeValue[0]}`] && IGNORE_EXPLICIT_NAMESPACE_SCRIPT_INCLUDES.indexOf(nodeValue[0]) === -1)
                return {
                    type : 'ExpressionStatement',
                    line : _node.loc?.start?.line,
                    scriptInclude: `${scriptScope}.${nodeValue[0]}`,
                    id: scriptIncludeCache[`${scriptScope}.${nodeValue[0]}`],
                    method: nodeValue[1] ? nodeValue[1] : null
                }
        }
    }

    /** ig: 
     * var someVariable = new global.ChangeCheckConflictsSNC().MAINTENANCE_WINDOW 
     * var someVariable = global.ChangeCheckConflictsSNC.MAINTENANCE_WINDOW
     * */
    if(_node.type === 'VariableDeclarator' && (_node.init?.type === 'MemberExpression' || _node.init?.type === 'NewExpression')){
        let nodeValue =  removeParentesis(astring.generate(_node.init)).split('.');
        
        if(_node.init.object?.type === 'NewExpression')
            nodeValue[0] =  removeParentesis(astring.generate(_node.init.object.callee)).split('.')[0]; 

        if(_node.init.type === 'NewExpression')
            nodeValue[0] =  removeParentesis(astring.generate(_node.init.callee)).split('.')[0]; 
        
        if(availableScopes.indexOf(nodeValue[0]) !== -1){
            if(scriptIncludeCache[`${nodeValue[0]}.${nodeValue[1]}`]) 
                return {
                    type : 'VariableDeclarator',
                    line : _node.loc?.start?.line,
                    scriptInclude: `${nodeValue[0]}.${nodeValue[1]}`,
                    id: scriptIncludeCache[`${nodeValue[0]}.${nodeValue[1]}`],
                    method: nodeValue[2] ? nodeValue[2] : null
                } 
        }else{
            if(scriptIncludeCache[`${scriptScope}.${nodeValue[0]}`] && IGNORE_EXPLICIT_NAMESPACE_SCRIPT_INCLUDES.indexOf(nodeValue[0]) === -1)
                return {
                    type : 'VariableDeclarator',
                    line : _node.loc?.start?.line,
                    scriptInclude: `${scriptScope}.${nodeValue[0]}`,
                    id: scriptIncludeCache[`${scriptScope}.${nodeValue[0]}`],
                    method: nodeValue[1] ? nodeValue[1] : null
                }
        }
    }

    /** ig: 
     * var someVariable = new global.ChangeCheckConflictsSNC().getBoolPropertyValue()  
     * var someVariable = global.ChangeCheckConflictsSNC.getBoolPropertyValue() 
     * */
    if(_node.type === 'VariableDeclarator' && _node.init?.type === 'CallExpression'){
        let nodeValue = removeParentesis(astring.generate(_node.init.callee)).split('.'); 
        if(_node.init.callee.object?.type === 'NewExpression')
            nodeValue[0] =  removeParentesis(astring.generate(_node.init.callee.object.callee)).split('.')[0];
        
        if(availableScopes.indexOf(nodeValue[0]) !== -1){
            if(scriptIncludeCache[`${nodeValue[0]}.${nodeValue[1]}`]) 
                return {
                    type : 'VariableDeclarator',
                    line : _node.loc?.start?.line,
                    scriptInclude: `${nodeValue[0]}.${nodeValue[1]}`,
                    id: scriptIncludeCache[`${nodeValue[0]}.${nodeValue[1]}`],
                    method: nodeValue[2] ? nodeValue[2] : null
                } 
        }else{
            if(scriptIncludeCache[`${scriptScope}.${nodeValue[0]}`] && IGNORE_EXPLICIT_NAMESPACE_SCRIPT_INCLUDES.indexOf(nodeValue[0]) === -1)
                return {
                    type : 'VariableDeclarator',
                    line : _node.loc?.start?.line,
                    scriptInclude: `${scriptScope}.${nodeValue[0]}`,
                    id: scriptIncludeCache[`${scriptScope}.${nodeValue[0]}`],
                    method: nodeValue[1] ? nodeValue[1] : null
                }
        }
    }
}

export default {
    isGlideRecordNext, 
    getConstructorContextExpresions, 
    getGlideRecordFromDeclaration, 
    getGlideRecordFromAssignment, 
    checkNestedWhileRecord, 
    findScriptIncludeCalls
};

