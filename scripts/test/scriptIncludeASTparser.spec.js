import * as acorn from 'acorn';
import runScriptIncludesCodeAnalisis from '../src/astParser/scriptIncludesStaticCodeAnalysis.js';

import fs from 'fs';


let script = fs.readFileSync("./scripts/test/sampleScripts/ChangeRequestSNC.js", 'utf-8');

const astTree = acorn.parse(script, {
  ecmaVersion: 'latest',
  locations: true,
  /* onComment: (block, text, start, end) => {console.log({block, text, start, end})}, */
});

console.log(runScriptIncludesCodeAnalisis(astTree)); //?

describe("quick test", function () {
  it("jasmin test 1", function () {
    expect(true);
  });

  it("jasmin test 2", function () {
    expect(false);
  });
});
