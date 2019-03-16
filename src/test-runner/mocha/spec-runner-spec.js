import assert from '../../_test-helper/assert';
import {
  es6ToEs5CodeForTestingOnly as es6ToEs5Code,
  runSpecsForTestingOnly as runSpecs
} from './spec-runner';

describe('Transpile', () => {
  describe('WHEN transpileToEs5=true', () => {
    const transpileToEs5 = (sourceCode) =>
      es6ToEs5Code({sourceCode, transpileToEs5: true});
    it('transpiles code (the `import` statement)', () => {
      const es6Code = 'import assert from "assert"';
      const es5Code = transpileToEs5(es6Code);
      assert(es5Code.includes('require("assert")'), `Expected transpiled code to contain "require(assert)", was NOT found.`);
    });
  });
  describe('WHEN transpileToEs5=false', () => {
    const noopTranspile = (sourceCode) =>
      es6ToEs5Code({sourceCode, transpileToEs5: false});
    it('transpiles code (the `import` statement)', () => {
      const es6Code = 'import assert from "assert";';
      const es5Code = noopTranspile(es6Code);
      assert.equal(es5Code, es6Code);
    });
  });
});

describe('Running a spec', () => {
  it('an empty files runs through silently', () => {
    const deps = {emptyErrorPane: () => {}, es6ToEs5Code: () => {}, fillErrorPaneWith: () => {}};
    assert.doesNotThrow(() => runSpecs({sourceCode: ''}, deps));
  });
  it('executes the passed source', () => {
    // Make the eval'ed code assign `x=42` to the global object.
    const globalObject = (new Function("return this"))();
    const sourceCode = '((new Function("return this"))()).x = 42;';
    let fillErrorPaneWithWasCalled = false;
    const deps = {emptyErrorPane: () => {}, es6ToEs5Code: () => sourceCode, fillErrorPaneWith: (...args) => { fillErrorPaneWithWasCalled = args; }};
    runSpecs({sourceCode: ''}, deps);
    assert.equal(fillErrorPaneWithWasCalled, false, '`fillErrorPaneWith()` should not have been called, but was called with: ' + fillErrorPaneWithWasCalled);
    assert.equal(globalObject.x, 42);
  });
});
