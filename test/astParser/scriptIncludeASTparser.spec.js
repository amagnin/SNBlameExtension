import runScriptIncludesCodeAnalisis from '../../scripts/src/astParser/scriptIncludesStaticCodeAnalysis.js';

import fs from 'fs';

describe("Script Include Parser", function () {
  it("should generate an object with the correct structure", function () {
    let script = fs.readFileSync("./test/sampleScripts/ClassExtendsScriptIncludeMock.js", 'utf-8');

    const parsedScriptInclude = runScriptIncludesCodeAnalisis(script, {}, 'global', ['global']);

    expect(parsedScriptInclude.SampleScriptOne.extends).toEqual('SampleExtends')
    
    expect(parsedScriptInclude.SampleScriptOne.methods.CONSTANT).toEqual('table_name_on_constant');
    expect(parsedScriptInclude.SampleScriptOne.methods.methodOne).toBeTruthy();
    expect(parsedScriptInclude.SampleScriptOne.methods.methodTwo).toBeTruthy();
    expect(parsedScriptInclude.SampleScriptOne.methods.methodTree).toBeTruthy();

    expect(parsedScriptInclude.SampleScriptOne.methods.methodOne.args).toEqual(['value', 'valueTwo']);
    expect(parsedScriptInclude.SampleScriptOne.methods.methodOne.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name_on_constant', 
        variable: 'grRecord', 
        loop: true 
      })
    );


    expect(parsedScriptInclude.SampleScriptOne.methods.methodTwo.args).toEqual([]);
    expect(parsedScriptInclude.SampleScriptOne.methods.methodTwo.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name', 
        variable: 'grRecord', 
      })
    );

    expect(parsedScriptInclude.SampleScriptOne.methods.methodFour.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name_on_constant', 
        variable: 'grRecord'
      })
    );

    expect(parsedScriptInclude.SampleScriptOne.methods.methodFive.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name', 
        variable: 'grRecord', 
        loop: true 
      })
    );

    expect(parsedScriptInclude.SampleScriptOne.methods.methodTwo.glideRecord[0].loop).toBeUndefined()

  });
});
