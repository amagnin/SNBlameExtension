var SampleScriptOne = Class.create();

SampleScriptOne.prototype =  Object.extendsObject(SampleExtends, {

    CONSTANT: 'table_name_on_constant',
    OBJECT_OF_CONSTANTS: {
        CONSTANT_ONE: 'value1',
        CONSTANT_TWO: 'value1',
        CONSTANT_TREE: 'value1',
    },

    methodOne: function(value, valueTwo){
        /** GlideRecord Call from VariableDeclarator */
        var grRecord = new GlideRecord(this.CONSTANT);
        grRecord.addQuery('field', '!=', value);
        grRecord.addQuery('field1', '!=', valueTwo);
        grRecord.query();

        while(grRecord.next()){
            grRecord.field = value
            grRecord.update();
        }
    },

    methodTwo: function(){
        /** GlideRecord Call from VariableDeclarator */
        var grRecord = new GlideRecord('table_name');
        grRecord.addQuery('field', '!=', 'value');
        grRecord.addQuery('field1', '!=', 'value');
        grRecord.setLimit(1);
        grRecord.query();

        return grRecord.hasNext();
    },

    methodTree: function(){
        this.methodOne()

        var someVariable = new SampleScriptOne().methodTree()

        return someVariable;
    },

    methodFour: function(value, valueTwo){
        /** GlideRecord Call from AssignmentExpression */
        var grRecord
        grRecord = new GlideRecord(this.CONSTANT);
        grRecord.addQuery('field', '!=', value);
        grRecord.addQuery('field1', '!=', valueTwo);
        grRecord.query();

        return grRecord.hasNext();
    },

    methodFive: function(){
        /** GlideRecord Call from AssignmentExpression */
        var grRecord
        grRecord = new GlideRecord('table_name');
        grRecord.addQuery('field', '!=', 'value');
        grRecord.addQuery('field1', '!=', 'value');
        grRecord.setLimit(1);
        grRecord.query();

        while(grRecord.next()){
            grRecord.field = value
            grRecord.update();
        }
    },

    type: 'SampleScriptOne'
});

SampleScriptOne.objectClassOne = function(){
    var grRecord = new GlideRecord('table_name');
    grRecord.addQuery('field', '!=', value);
    grRecord.addQuery('field1', '!=', valueTwo);
    grRecord.query();

    while(grRecord.next()){
        grRecord.field = value
        grRecord.update();
    }
};

SampleScriptOne.objectClassTwo = function(){
    var grRecord = new GlideRecord('table_name_two');
    grRecord.addQuery('field', '!=', 'value');
    grRecord.addQuery('field1', '!=', 'value');
    grRecord.setLimit(1);
    grRecord.query();

    return grRecord.hasNext();
};

SampleScriptOne.someObject = {
    CONSTANT_ONE: 'value1',
    CONSTANT_TWO: 'value1',
    CONSTANT_TREE: 'value1',
}

var SampleScriptTwo = Class.create();

SampleScriptTwo.prototype = {

    initialize: function(argOne, argTwo){
        this.constructorTable = 'task_table'
    },

    methodOne: function(value, valueTwo){
        var grRecord = new GlideRecord(this.constructorAddedKey);
        grRecord.addQuery('field', '!=', value);
        grRecord.addQuery('field1', '!=', valueTwo);
        grRecord.query();

        while(grRecord.next()){
            grRecord.field = value
            grRecord.update();
        }
    },

    methodTwo: function(){
        var grRecord = new GlideRecord(this.constructorAddedKey);
        grRecord.addQuery('field', '!=', 'value');
        grRecord.addQuery('field1', '!=', 'value');
        grRecord.setLimit(1);
        grRecord.query();

        return grRecord.hasNext();
    },

    methodTree: function(){
        this.methodOne()

        var someVariable = new SampleScriptOne().methodTree()

        return someVariable;
    },

    type: 'SampleScriptOne'
};
