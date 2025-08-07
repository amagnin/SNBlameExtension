import * as walk from 'acorn-walk';
import * as acorn from 'acorn';
import * as astring from 'astring';

import walkerFunctions from './walkerFunctions.js';

/**
 *  @module scriptIncludesStaticCodeAnalysis
 *  @see module:scriptIncludesToExtraLib
 * 
 *  @exports runScriptIncludesCodeAnalisis
 * 
 *  @example
 *  this module will Create a object containing all methods of the class and all methods on the constructor  
 *  className : {  
 *      methods: {  
 *          initialize: {  
 *              args: [],  
 *              glideRecord: [{table, variable, loop: boolean}],  
 *              dependencies: [  
 *                  {className: class, methods: [method1, method2], isScriptInclude: Boolean, glideRecord: [{table, variable, loop: boolean}]},  
 *                  {func: functionName, glideRecord: [{table, variable, loop: boolean}] }  
 *              ]},  
 *          method1 : ...,  
 *          method2 : ...,  
 *          constant: 'CONTSANT',  
 *      }  
 *      static: {  
 *          someFucntion : {args: [],  glideRecord: [{table, variable, loop: boolean}]},  
 *          someConstant : 'CONTSANT',  
 *          someOtherConstnat: {type: 'Object', value: {}}  
 *      }  
 *      extends: className;  
 *  }  
 *  
 * 
 *  AST Node Types:  
 *  - AssignmentExpression  
 *  - ArrayExpression  
 *  - BlockStatement  
 *  - BinaryExpression  
 *  - BreakStatement  
 *  - CallExpression  
 *  - CatchClause  
 *  - ConditionalExpression  
 *  - ContinueStatement  
 *  - DoWhileStatement  
 *  - DebuggerStatement  
 *  - EmptyStatement  
 *  - ExpressionStatement  
 *  - ForStatement  
 *  - ForInStatement  
 *  - FunctionDeclaration  
 *  - FunctionExpression  
 *  - Identifier  
 *  - IfStatement  
 *  - Literal  
 *  - LabeledStatement  
 *  - LogicalExpression  
 *  - MemberExpression  
 *  - NewExpression  
 *  - ObjectExpression  
 *  - Program  
 *  - Property  
 *  - ReturnStatement  
 *  - SequenceExpression  
 *  - SwitchStatement  
 *  - SwitchCase  
 *  - ThisExpression  
 *  - ThrowStatement  
 *  - TryStatement  
 *  - UnaryExpression  
 *  - UpdateExpression  
 *  - VariableDeclaration  
 *  - VariableDeclarator  
 *  - WhileStatement  
 *  - WithStatement  
 *   
 *   
 *  SNScriptIncludeCache: /api/now/syntax_editor/cache/sys_script_include  
 *  SNIntelisence: /api/now/v1/syntax_editor/intellisense/sys_script_include  
 */


/**
 * function to traverse the AST tree of the scirpt include and identify class static methods, methods, GlideRecord Calls other script include invactions, etc
 * 
 * @param {Object} astTree AST Tree of the Script include to analize
 * @param {Object} serviceNowClasses Variable declaration or Expressions statment on the body of the script, typicaly it should be the static methods, or a new class instantiation
 * @param {Object} scriptIncludeCache Servicenow Script include hash map (scope.className:sys_id)
 * @param {string} currentScope The script scope
 * @param {Array<string>} availableScopes All the available scopes on the isntance that has at least 1 script include (retrieved from the scriptIncludeCache)
 * @returns {Object} simplified representation of the ServiceNow Script include.
 */
const getSNClassMethods = (astTree, serviceNowClasses, scriptIncludeCache, currentScope, availableScopes) => {
    let serviceNowClassesName = serviceNowClasses.reduce( (acc, node) => {
        if( node.type === 'VariableDeclaration')
            acc[node.declarations[0].id.name] = {
                methods:{},
                static:{},
                extends: null
            };

            
        if(node.type === 'ExpressionStatement')
            acc[node.expression.left.name] = {
                methods:{},
                static:{},
                extends: null
            };

        return acc
    }, {});

    const snClassPrototype = astTree.body.filter(node => 
        node.type === 'ExpressionStatement' && 
        node.expression?.left?.property?.name === 'prototype'
    );

    astTree.body.filter(node => 
        node.type === 'ExpressionStatement' && 
        node.expression?.left?.property?.name !== 'prototype' &&
        node.expression?.left?.type === 'MemberExpression'
    ).forEach(node => {
        
        if(!serviceNowClassesName[node.expression.left.object?.name]) return

        let name = node.expression.left.object.name;
        let key = node.expression.left.property.name;

        if(node.expression.right?.type === 'FunctionExpression'){
            serviceNowClassesName[node.expression.left.object.name].static[key] = {
                args:[],
                glideRecord: [],
            }

            serviceNowClassesName[name].static[key].args = node.expression.right.params.map(e=> e.name);
            return
        }

        if(node.expression.right?.type === 'Literal'){
            serviceNowClassesName[name].static[key] = node.expression.right.value
            return
        }    

        serviceNowClassesName[name].static[key] =  { type: node.expression.right?.type, value: node.expression.right } ;
       
    });
    
    snClassPrototype.forEach(node => {
        let name = node.expression?.left?.object?.name
        if(!name) return;

        if(node.expression?.right.type === "CallExpression" && 
            (
                node.expression?.right.callee?.object.name !== 'Object' ||
                node.expression?.right.callee?.property.name !== 'extendsObject'
            ))
            return;

        
        if((node.expression?.right?.arguments || [])[1]?.properties){
            node.expression.right.arguments[0] //?
            serviceNowClassesName[name].extends = astring.generate(node.expression.right.arguments[0]);
        }

        (node.expression?.right?.properties || node.expression?.right?.arguments[1].properties /** Object.extends **/ ).forEach(property => {

            if(property.value.type === 'FunctionExpression'){
                let key = property.key.name
                serviceNowClassesName[name].methods[key] = {
                    args:[],
                    glideRecord:[],
                    dependencies:[]
                }

                serviceNowClassesName[name].methods[key].args = property.value.params.map(e=> e.name)
                serviceNowClassesName[name].methods[key].scriptIncludeCalls = [];
                let isConstructor = key === 'initialize';
                
                walk.simple(property.value, {
                    ExpressionStatement(_node){
                        let scriptIncludeCall = walkerFunctions.findScriptIncludeCalls(_node, scriptIncludeCache, currentScope, availableScopes);
                        if(scriptIncludeCall)
                            serviceNowClassesName[name].methods[key].scriptIncludeCalls.push(scriptIncludeCall);

                        if(!isConstructor)
                            return;
                        
                        /** Find class member assignment on constructor*/
                        let constructorExpression = walkerFunctions.getConstructorContextExpresions(_node);
                        
                        if(constructorExpression?.type === 'Literal'){
                            serviceNowClassesName[name].methods[constructorExpression.key] = constructorExpression.value
                        }

                        if(constructorExpression?.type === 'FunctionExpression'){
                            serviceNowClassesName[name].methods[constructorExpression.key] = {
                                args: constructorExpression.args,
                                glideRecord: []
                            }
                        }
                    },
                    VariableDeclarator(_node){
                        let {tableNode, variable} = walkerFunctions.getGlideRecordFromDeclaration(_node) || {};
                        if(tableNode && variable){
                            let table = getTableName(tableNode, serviceNowClassesName, name, astTree)
                            serviceNowClassesName[name].methods[key].glideRecord.push({table, variable})
                        }
                    },
                    AssignmentExpression(_node){
                        let {tableNode, variable} = walkerFunctions.getGlideRecordFromAssignment(_node) || {};
                        if(tableNode && variable){
                            let table = getTableName(tableNode, serviceNowClassesName, name, astTree)
                            serviceNowClassesName[name].methods[key].glideRecord.push({table, variable})
                        }                
                    },
                    WhileStatement(_node) {
                        let glideRecord = walkerFunctions.checkNestedWhileRecord(_node, serviceNowClassesName[name].methods[key]);
                        if (glideRecord) 
                            serviceNowClassesName[name].methods[key].glideRecord.push(glideRecord);       
                    },
                })
                
                return;
            }

            if(property.value.type === 'Literal'){
                serviceNowClassesName[name].methods[property.key.name] = property.value.value;
                return
            }

            serviceNowClassesName[name].methods[property.key.name] =  { type: property.value.type, value: property.value };
        })
    })
    
    return serviceNowClassesName
}

/**
 * 
 * @param {Object} node: AST Node for the GlideRecord or GlideRecord Secure Variable initializetion or variable assignement
 * @param {Object} serviceNowClassesName : Object being generated with the Class structure
 * @param {string} className : Class name of the current Class beging analized (note script inclidues can define more than 1 Class)
 * @param {Object} astTree : complete AST of the script include being analized
 * @returns {string | Object} if the table name is found returns the name of the funciton if not it returns the entire ast node 
 */
const getTableName = (node, serviceNowClassesName, className, astTree) => { 
    if(node.type === 'Literal')
        return node.value
    
    if(node?.object?.type === 'ThisExpression' && serviceNowClassesName[className].methods[node?.property?.name]){
        return serviceNowClassesName[className].methods[node?.property?.name]; 
    }
  
    if(node?.object?.name === className && serviceNowClassesName[className].static[node?.property?.name]){
        return serviceNowClassesName[className].static[node?.property?.name]; 
    }

    /** if object find object */
    /** if variable, find variable assignation on block? */
   
    return node;
}

/**
 * runCodeAnalisis: ast static code analisis
 * 
 * @param {string} script: Script Includes content
 * @returns {Object} Object containing information of all classes found on the script include
 * @example 
 * {
 *   classNameOne : {  
 *      methods: {  
 *          initialize: {  
 *              args: [],  
 *              glideRecord: [{table, variable, loop: boolean}],  
 *              dependencies: [  
 *                  {className: class, methods: [method1, method2], isScriptInclude: Boolean, glideRecord: [{table, variable, loop: boolean}]},  
 *                  {func: functionName, glideRecord: [{table, variable, loop: boolean}] }  
 *              ]},  
 *          method1 : ...,  
 *          method2 : ...,  
 *          constant: 'CONSTANT',  
 *      }  
 *      static: {  
 *          someFucntion : {args: [],  glideRecord: [{table, variable, loop: boolean}]},  
 *          someConstant : 'CONSTANT',  
 *          someOtherConstnat: {type: 'Object', value: {}}  
 *      }  
 *      extends: ExtendedClassName;  
 *  },
 *  classNameTwo: {
 *      methods: {...}
 *      static: {...}
 *  }  
 * }
 * 
 **/
function runScriptIncludesCodeAnalisis(script, scriptIncludeCache, currentScope, availableScopes) {

    let astTree = acorn.parse(script, {
        ecmaVersion: 'latest',
        locations: true,
        /* onComment: (block, text, start, end) => {}, */
    })
    
    /** we can have more than 1 class per script include */

    /**
     * VariableDeclaration: var ClassName = Class.create()
     * ExpressionStatemen: ClassName = Class.create()
     */
    const serviceNowClasses = astTree.body.filter(node => 
        (
            node.type === 'VariableDeclaration' && 
            node?.declarations[0]?.init?.callee?.object?.name === 'Class' && 
            node?.declarations[0]?.init?.callee?.property?.name === 'create'
        ) ||
        (
            node.type === 'ExpressionStatement' && 
            node?.expression?.right?.callee?.object?.name === 'Class' &&
            node?.expression?.right?.callee?.property?.name === 'create'
        )
    );

    if(serviceNowClasses.length === 0) return [];

    return getSNClassMethods(astTree, serviceNowClasses, scriptIncludeCache, currentScope, availableScopes) ;
}

export default runScriptIncludesCodeAnalisis;