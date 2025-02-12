import * as acorn from 'acorn';
import runScriptIncludesCodeAnalisis from '../../scripts/src/astParser/scriptIncludesStaticCodeAnalysis.js';

import fs from 'fs';



describe("Script Include Parser", function () {
  it("should generate an object with the correct structure", function () {
    let script = fs.readFileSync("./test/sampleScripts/ClassExtendsScriptIncludeMock.js", 'utf-8');

    const parsedScriptInclude = runScriptIncludesCodeAnalisis(script, {}, 'global', ['global']);

    expect(parsedScriptInclude.SampleScriptOne.extends).toEqual('SampleExtends')
    
    expect(parsedScriptInclude.SampleScriptOne.classKeys.CONSTANT).toEqual('table_name_on_constant');
    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodOne).toBeTruthy();
    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodTwo).toBeTruthy();
    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodTree).toBeTruthy();

    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodOne.args).toEqual(['value', 'valueTwo']);
    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodOne.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name_on_constant', 
        variable: 'grRecord', 
        loop: true 
      })
    );


    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodTwo.args).toEqual([]);
    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodTwo.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name', 
        variable: 'grRecord', 
      })
    );

    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodFour.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name_on_constant', 
        variable: 'grRecord'
      })
    );

    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodFive.glideRecord[0]).toEqual(
      jasmine.objectContaining({ 
        table: 'table_name', 
        variable: 'grRecord', 
        loop: true 
      })
    );

    expect(parsedScriptInclude.SampleScriptOne.classKeys.methodTwo.glideRecord[0].loop).toBeUndefined()

  });
});
