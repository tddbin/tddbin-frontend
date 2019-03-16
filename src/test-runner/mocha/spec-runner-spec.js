import assert from '../../_test-helper/assert';
import sinon from 'sinon';
import {
  es6ToEs5CodeForTestingOnly as es6ToEs5Code,
  runSpecsForTestingOnly as runSpecs
} from './spec-runner';

describe('Transpile', () => {
  it('transpiles code (the `import` statement)', () => {
    const es6Code = 'import assert from "assert"';
    const es5Code = es6ToEs5Code(es6Code);
    assert(es5Code.includes('require("assert")'), `Expected transpiled code to contain "require(assert)", was NOT found.`);
  });
});

describe('Running a spec', () => {
  const noop = () => () => {};
  const buildDeps =
    ({emptyErrorPane = noop(), es6ToEs5Code = noop(), fillErrorPaneWith = noop()} = {}) =>
      ({emptyErrorPane, es6ToEs5Code, fillErrorPaneWith});
  it('an empty files runs through silently', () => {
    const emptyFile = '';
    assert.doesNotThrow(() => runSpecs({sourceCode: emptyFile}, buildDeps({es6ToEs5Code: () => emptyFile})));
  });
  it('the error pane is always emptied', () => {
    const emptyErrorPane = sinon.spy();
    const deps = {emptyErrorPane};
    runSpecs({sourceCode: ''}, buildDeps(deps));
    assert.called(emptyErrorPane);
  });
  it('executes the passed source', () => {
    // Make the eval'ed code assign `x=42` to the global object.
    const globalObject = (new Function("return this"))();
    const sourceCode = '((new Function("return this"))()).x = 42;';
    const fillErrorPaneWith = sinon.spy();
    const deps = buildDeps({es6ToEs5Code: () => sourceCode, fillErrorPaneWith});
    runSpecs({sourceCode: ''}, deps);
    assert.notCalled(fillErrorPaneWith);
    assert.equal(globalObject.x, 42);
  });
  describe('WHEN the source can not be executed', () => {
    it('fills the error pane', () => {
      const fillErrorPaneWith = sinon.spy();
      const invalidCode = 'invalid code';
      const deps = buildDeps({es6ToEs5Code: () => invalidCode, fillErrorPaneWith});
      runSpecs({sourceCode: ''}, deps);
      assert.called(fillErrorPaneWith);
    });
    it('fills the error pane AND the message includes the invalid code', () => {
      const fillErrorPaneWith = sinon.spy();
      const invalidCode = 'invalid code';
      const deps = buildDeps({es6ToEs5Code: () => invalidCode, fillErrorPaneWith});
      runSpecs({sourceCode: ''}, deps);
      assert(fillErrorPaneWith.firstCall.args[0].includes(invalidCode));
    });
  });
  it('if `transpileToEs5=false`, dont call `es6ToEs5Code()`', () => {
    const es6ToEs5Code = sinon.spy();
    const deps = buildDeps({es6ToEs5Code});
    runSpecs({sourceCode: '', transpileToEs5: false}, deps);
    assert.notCalled(es6ToEs5Code);
  });
});
