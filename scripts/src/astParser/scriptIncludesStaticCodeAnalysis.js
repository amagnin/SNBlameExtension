import * as walk from 'acorn-walk';
import * as acorn from 'acorn';
import * as astring from 'astring';

/**
 * SNScriptIncludeCache: /api/now/syntax_editor/cache/sys_script_include
 * 
 */

/**
 * 
 *  this module will Create a object containing all methods of the class and all methods on the constructor
 *  className : {
 *      classKeys: {
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
 *      keys: {
 *          someFucntion : {args: [],  glideRecord: [{table, variable, loop: boolean}]},
 *          someConstant : 'CONTSANT',
 *          someOtherConstnat: {type: 'Object', value: {}}
 *      }
 *      extends: className;
 *  }
 *  
 */

const isGlideRecordNext = (type, node) => type === 'CallExpression' && /^(_){0,1}next/.test(node?.callee?.property?.name);

const getSNClassMethods = (astTree, serviceNowClasses) => {
    let serviceNowClassesName = serviceNowClasses.reduce( (acc, node) => {
        if( node.type === 'VariableDeclaration')
            acc[node.declarations[0].id.name] = {
                classKeys:{},
                keys:{},
                extends: null
            };

            
        if(node.type === 'ExpressionStatement')
            acc[node.expression.left.name] = {
                classKeys:{},
                keys:{},
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
            serviceNowClassesName[node.expression.left.object.name].keys[key] = {
                args:[],
                glideRecord: [],
            }

            serviceNowClassesName[name].keys[key].args = node.expression.right.params.map(e=> e.name);
            return
        }

        if(node.expression.right?.type === 'Literal'){
            serviceNowClassesName[name].keys[key] = node.expression.right.value
            return
        }    

        serviceNowClassesName[name].keys[key] =  { type: node.expression.right?.type, value: node.expression.right } ;
       
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
                serviceNowClassesName[name].classKeys[key] = {
                    args:[],
                    glideRecord:[],
                    dependencies:[]
                }

                serviceNowClassesName[name].classKeys[key].args = property.value.params.map(e=> e.name)
                let isConstructor = key === 'initialize';
                
                walk.simple(property.value, {
                    /**
                     * Finds any method or constant added to the Instantiated Class by the constructor (initialize) 
                     * 
                     * @param {Object AST Node} _node 
                     * @returns undefined
                     */
                    ExpressionStatement(_node){
                        if(!isConstructor)
                            return;
                        let left = _node.expression?.left;
                        let right = _node.expression?.right;

                        if(left?.type === 'MemberExpression' && left?.object?.type === 'ThisExpression'){
                            serviceNowClassesName[name].classKeys[left.property.name] = right.value || right.properties
                        }
                    },
                    /**
                     * Finds GlideRecord and GlideRecordSecure initializations on variable declarations:
                     * var grRecord = new GlideRecord('table'), and stores the info on the class and method
                     * 
                     * [{
                     *      table: String|AST Node - String if we can find the literal, otherwise the AST Node
                     *      variable: String - Variable Name
                     * }]
                     * 
                     * @param {Object AST Node} _node 
                     * 
                     */
                    VariableDeclarator(_node){
                        if(_node.init?.type === 'NewExpression' && (_node.init?.callee.name === 'GlideRecord' || _node.init?.callee.name === 'GlideRecordSecure')){
                            const table = getTableName(_node.init.arguments[0], serviceNowClassesName, name, astTree);
                            const variable = _node.id.name;

                            serviceNowClassesName[name].classKeys[key].glideRecord.push({table, variable})
                        }
                    },
                    /**
                     * Finds GlideRecord and GlideRecordSecure initializations on variable assignment:
                     * grRecord = new GlideRecord('table'), and stores the info on the class and method
                     * 
                     * [{
                     *      table: String|AST Node - String if we can find the literal, otherwise the AST Node
                     *      variable: String - Variable Name
                     * }]
                     * 
                     * @param {Object AST Node} _node 
                     * 
                     */
                    AssignmentExpression(_node){
                        if(_node.right?.type === 'NewExpression' && (_node.right?.callee.name === 'GlideRecord' || _node.right?.callee.name === 'GlideRecordSecure')){
                            const table = getTableName(_node.right.arguments[0], serviceNowClassesName, name, astTree);
                            const variable = _node.left.name;

                            serviceNowClassesName[name].classKeys[key].glideRecord.push({table, variable}) 
                        }
                    },
                    /**
                     * Find While statment used to loop over glideRecords and set the loop to true on the Object storing the GlideRecord information.
                     * 
                     * @param {Object AST Node} _node 
                     * 
                     */
                    WhileStatement(_node) {
                        let glideRecord = walk.findNodeAt(_node.test, null, null, isGlideRecordNext)?.node;
                        
                        if (!glideRecord) 
                            return;

                        let grRecord = serviceNowClassesName[name].classKeys[key].glideRecord.find(gr => gr.variable === glideRecord.callee.object.name);
                        
                        if(grRecord) 
                            grRecord.loop = true;
                        else
                            serviceNowClassesName[name].classKeys[key].glideRecord.push({table: null, variable: glideRecord.callee.object.name, loop: true})
                    },
                })
                
                return;
            }

            if(property.value.type === 'Literal'){
                serviceNowClassesName[name].classKeys[property.key.name] = property.value.value;
                return
            }

            serviceNowClassesName[name].classKeys[property.key.name] =  { type: property.value.type, value: property.value };
        })
    })
    
    return serviceNowClassesName
}

const getTableName = (node, serviceNowClassesName, className, astTree) => { 
    if(node.type === 'Literal')
        return node.value
    
    if(node?.object?.type === 'ThisExpression' && serviceNowClassesName[className].classKeys[node?.property?.name]){
        return serviceNowClassesName[className].classKeys[node?.property?.name]; 
    }
  
    if(node?.object?.name === className && serviceNowClassesName[className].keys[node?.property?.name]){
        return serviceNowClassesName[className].keys[node?.property?.name]; 
    }

    /** if object find object */
    /** if variable, find variable assignation on block? */
   
    return node;
}

/**
 * runCodeAnalisis: ast static code analisis
 * 
 * @param {String} script_include_string script 
 * 
 * 
 *  AssignmentExpression
 *  ArrayExpression
 *  BlockStatement
 *  BinaryExpression
 *  BreakStatement
 *  CallExpression
 *  CatchClause
 *  ConditionalExpression
 *  ContinueStatement
 *  DoWhileStatement
 *  DebuggerStatement
 *  EmptyStatement
 *  ExpressionStatement
 *  ForStatement
 *  ForInStatement
 *  FunctionDeclaration
 *  FunctionExpression
 *  Identifier
 *  IfStatement
 *  Literal
 *  LabeledStatement
 *  LogicalExpression
 *  MemberExpression
 *  NewExpression
 *  ObjectExpression
 *  Program
 *  Property
 *  ReturnStatement
 *  SequenceExpression
 *  SwitchStatement
 *  SwitchCase
 *  ThisExpression
 *  ThrowStatement
 *  TryStatement
 *  UnaryExpression
 *  UpdateExpression
 *  VariableDeclaration
 *  VariableDeclarator
 *  WhileStatement
 *  WithStatement 
 **/
function runScriptIncludesCodeAnalisis(script) {

    let astTree = acorn.parse(script, {
        ecmaVersion: 'latest',
        locations: true,
        /* onComment: (block, text, start, end) => {console.log({block, text, start, end})}, */
    })
    
    /** you can have more than 1 class per script include */

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

    return getSNClassMethods(astTree, serviceNowClasses) ;
}

export default runScriptIncludesCodeAnalisis