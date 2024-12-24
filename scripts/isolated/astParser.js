window.addEventListener('sn-blame-model-change', (event) => {
  const { script, field } = event.detail;

  const astTree = acorn.parse(script, {
    ecmaVersion: 'latest',
    locations: true,
    /* onComment: (block, text, start, end) => {console.log({block, text, start, end})}, */
    });
    runScriptIncludesCodeAnalisis(astTree);
});

const isGlideRecordNext = (type, node) => type === 'CallExpression' && /^(_){0,1}next/.test(node?.callee?.property?.name)
const findGlideRecordArgument = (type, node) => { 
    if(type === 'AssignmentExpression' && node.right.type === 'NewExpression' && node.right.callee.name === 'GlideRecord'){
        return true
    }
    if(type === 'VariableDeclaration' && node.init.type === 'NewExpression' && node.init.callee.name === 'GlideRecord'){
        return true
    }
    return false;
}

const getSNClassMethods = (astTree, serviceNowClasses) => {
    let serviceNowClassesName = serviceNowClasses.reduce( (acc, node) => {
        acc[node.declarations[0].id.name] = {};

        return acc
    }, {});

    const snClassPrototype = astTree.body.filter(node => 
        node.type === 'ExpressionStatement' && 
        node.expression?.left?.property?.name === 'prototype'
    );

    snClassPrototype.forEach(node => {
        let name = node.expression?.left?.object?.name
        if(!name) return;

        if(node.expression?.right.type === "CallExpression" && 
            (
                node.expression?.right.callee?.object.name !== 'Object' ||
                node.expression?.right.callee?.property.name !== 'extendsObject'
            ))
            return;

        (node.expression?.right?.properties || node.expression?.right?.arguments[1].properties /** Object.extends **/ ).forEach(property => {
            if(property.value.type === 'FunctionExpression'){
                serviceNowClassesName[name][property.key.name] = {
                    glideRecordCalls:[],
                    functinoCalls:[],
                }
                return;
            }
            serviceNowClassesName[name][property.key.name] =  property.value.type;
        })
    })

    return serviceNowClassesName
}
/**
 * runCodeAnalisis: ast static code analisis
 * 
 * @param {AST Node} astTree 
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

function runScriptIncludesCodeAnalisis(astTree) {
    
    /** you can have more than 1 class per script include */
    const serviceNowClasses =  astTree.body.filter(node => 
        node.type === 'VariableDeclaration' && 
        node?.declarations[0]?.init?.callee?.object?.name === 'Class' && 
        node?.declarations[0]?.init?.callee?.property?.name === 'create'
    );

    let serviceNowClassesName;
  
    if(serviceNowClasses.length){
        serviceNowClassesName = getSNClassMethods(astTree, serviceNowClasses)
    }

    acorn.walk.ancestor(astTree, {
        NewExpression(_node, _state, ancestors){
            if(_node.callee.name === 'GlideRecord' || _node.callee.name === 'GlideRecordSecure'){
                for (let i = ancestors.length - 1; i >= 0; i--) {

                    if(ancestors[i].type !== 'Property' || 
                        (
                            ancestors[i - 2]?.type !== 'AssignmentExpression' &&
                            ancestors[i - 2]?.type !== 'CallExpression' /** Object.extends **/
                        )){
                        continue;
                    }

                    const className = ancestors[i - 2]?.left?.object?.name || ancestors[i - 3].left?.object?.name /** Object.extends **/;
                    const key = ancestors[i]?.key?.name
                    if (!serviceNowClassesName[className][key])
                        continue;
                    
                    serviceNowClassesName[className][key].glideRecordCalls.push({
                        table: _node.arguments[0],
                        varName: ancestors[ancestors.length - 2]?.id?.name, /** TODO: check cornercases might not allways be true */
                    })
                    
                    break;
                }

            }
        },
        WhileStatement(_node, _state, ancestors) {
            let glideRecord = acorn.walk.findNodeAt(_node.test, null, null, isGlideRecordNext)?.node;
            let glideRecordArgument;

            if (glideRecord) {
                for (let i = ancestors.length - 1; i >= 0; i--) {
                    let checkForGlideRecord = ancestors[i].type === 'BlockStatement';
                
                    if (checkForGlideRecord){
                        acorn.walk.simple(ancestors[i],{
                            VariableDeclarator(ancestor, state){
                                if(ancestor.init?.type === 'NewExpression' && ancestor.init?.callee.name === 'GlideRecord')
                                    glideRecordArgument = ancestor.init.arguments;
                            },
                            AssignmentExpression(ancestor, state){
                                if(ancestor.right?.type === 'NewExpression' && ancestor.right?.callee.name === 'GlideRecord')
                                    glideRecordArgument = ancestor.right.arguments;
                            }
                        });
                    };

                    if(glideRecordArgument) 
                        break
                }
            }

            console.log(glideRecordArgument);
        },
  });

  console.log(serviceNowClassesName);
}
