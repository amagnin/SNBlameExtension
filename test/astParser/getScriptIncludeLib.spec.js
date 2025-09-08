import getScriptIncludeLib from '../../scripts/src/astParser/scriptIncludesToExtraLib.js';

describe('getScriptIncludeLib', () => {
  it('should generate a class definition with constructor and methods', () => {
    const className = 'TestClass';
    const scriptIncludesObject = {
      methods: {
        initialize: { args: ['arg1', 'arg2'] },
        method1: { args: [] },
        CONSTANT: 'someValue'
      },
      static: {
        someStaticMember1: { args: [] },
        someStaticMember2: { args: [] },
        CONSTANT: 'literal'
      }
    };

    const result = getScriptIncludeLib(className, scriptIncludesObject);
    expect(result).toContain('class TestClass');
    expect(result).toContain('constructor(arg1,arg2){}');
    expect(result).toContain('method1(){}');
    expect(result).toContain('CONSTANT = \'someValue\';');
    expect(result).toContain('static someStaticMember1 = (){};');
    expect(result).toContain('static someStaticMember2 = (){};');
    expect(result).toContain('static CONSTANT = \'literal\';');
  });

  it('should generate a class definition with object expressions', () => {
    const className = 'TestClass';
    const scriptIncludesObject = {
      methods: {
<<<<<<< HEAD
        obj: { type: 'ObjectExpression', value: '"value"' }
      },
      static: {
        staticObj: { type: 'ObjectExpression', value: '"value"' }
=======
        obj: { type: 'ObjectExpression', value: { value: 'value', type: 'Literal' } }
      },
      static: {
        staticObj: { type: 'ObjectExpression', value: { value: 'value', type: 'Literal' } }
>>>>>>> main
      }
    };

    //spyOn(astring, 'generate').and.callFake((node) => node.key);

    const result = getScriptIncludeLib(className, scriptIncludesObject);
    expect(result).toContain('class TestClass');
    expect(result).toContain('obj = "value"');
    expect(result).toContain('static staticObj = "value"');
  });

  it('should handle class inheritance', () => {
    const className = 'TestClass';
    const scriptIncludesObject = {
      extends: 'BaseClass',
      methods: {},
      static: {}
    };

    const result = getScriptIncludeLib(className, scriptIncludesObject);
    expect(result).toContain('class TestClass extends BaseClass');
  });
});