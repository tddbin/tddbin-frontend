import assert from '../../_test-helper/assert';
import sinon from 'sinon';
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
  const runSpecWithCode = (code) => {
    const deps = {emptyErrorPane: () => {}, es6ToEs5Code: () => code, fillErrorPaneWith: () => {}};
    runSpecs({sourceCode: code}, deps)
  };
  it('an empty files runs through silently', () => {
    const emptyFile = '';
    assert.doesNotThrow(() => runSpecWithCode(emptyFile));
  });
  it('the error pane is emptied', () => {
    const emptyErrorPane = sinon.spy();
    const deps = {emptyErrorPane, es6ToEs5Code: () => {}, fillErrorPaneWith: () => {}};
    runSpecs({sourceCode: ''}, deps);
    assert.called(emptyErrorPane);
  });
  it('executes the passed source', () => {
    // Make the eval'ed code assign `x=42` to the global object.
    const globalObject = (new Function("return this"))();
    const sourceCode = '((new Function("return this"))()).x = 42;';
    const fillErrorPaneWith = sinon.spy();
    const deps = {emptyErrorPane: () => {}, es6ToEs5Code: () => sourceCode, fillErrorPaneWith};
    runSpecs({sourceCode: ''}, deps);
    assert.notCalled(fillErrorPaneWith);
    assert.equal(globalObject.x, 42);
  });
  describe('WHEN the source can not be executed', () => {
    it('fills the error pane', () => {
      const fillErrorPaneWith = sinon.spy();
      const invalidCode = 'invalid code';
      const deps = {emptyErrorPane: () => {}, es6ToEs5Code: () => invalidCode, fillErrorPaneWith};
      runSpecs({sourceCode: ''}, deps);
      assert.called(fillErrorPaneWith);
    });
    it('fills the error pane AND the message includes the invalid code', () => {
      const fillErrorPaneWith = sinon.spy();
      const invalidCode = 'invalid code';
      const deps = {emptyErrorPane: () => {}, es6ToEs5Code: () => invalidCode, fillErrorPaneWith};
      runSpecs({sourceCode: ''}, deps);
      assert(fillErrorPaneWith.firstCall.args[0].includes(invalidCode));
    });
  });
});
