import assert from '../../_test-helper/assert';
import sinon from 'sinon';
import {
  transpileToEs5CodeForTestingOnly as transpileToEs5Code,
  runSpecsForTestingOnly as runSpecs
} from './spec-runner';

describe('Transpile', () => {
  it('transpiles code (the `import` statement)', () => {
    const es6Code = 'import assert from "assert"';
    const es5Code = transpileToEs5Code(es6Code);
    assert(es5Code.includes('require("assert")'), `Expected transpiled code to contain "require(assert)", was NOT found.`);
  });
});

describe('Running a spec', () => {
  const noop = () => () => {};
  const buildDeps =
    ({emptyErrorPane = noop(), transpileToEs5Code = noop(), fillErrorPaneWith = noop()} = {}) =>
      ({emptyErrorPane, transpileToEs5Code, fillErrorPaneWith});
  it('an empty files runs through silently', () => {
    const emptyFile = '';
    assert.doesNotThrow(() => runSpecs({sourceCode: emptyFile}, buildDeps({transpileToEs5Code: () => emptyFile})));
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
    const deps = buildDeps({transpileToEs5Code: () => sourceCode, fillErrorPaneWith});
    runSpecs({sourceCode: ''}, deps);
    assert.notCalled(fillErrorPaneWith);
    assert.equal(globalObject.x, 42);
  });
  describe('WHEN the source can not be executed', () => {
    it('fills the error pane', () => {
      const fillErrorPaneWith = sinon.spy();
      const invalidCode = 'invalid code';
      const deps = buildDeps({transpileToEs5Code: () => invalidCode, fillErrorPaneWith});
      runSpecs({sourceCode: ''}, deps);
      assert.called(fillErrorPaneWith);
    });
    it('fills the error pane AND the message includes the invalid code', () => {
      const fillErrorPaneWith = sinon.spy();
      const invalidCode = 'invalid code';
      const deps = buildDeps({transpileToEs5Code: () => invalidCode, fillErrorPaneWith});
      runSpecs({sourceCode: ''}, deps);
      assert(fillErrorPaneWith.firstCall.args[0].includes(invalidCode));
    });
  });
  it('if `transpileToEs5=false`, dont call `transpileToEs5Code()`', () => {
    const transpileToEs5Code = sinon.spy();
    const deps = buildDeps({transpileToEs5Code});
    runSpecs({sourceCode: '', transpileToEs5: false}, deps);
    assert.notCalled(transpileToEs5Code);
  });
});
