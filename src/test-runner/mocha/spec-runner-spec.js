import assert from '../../_test-helper/assert';
import {es6ToEs5Code} from './spec-runner';

describe('Spec runner', () => {
  it('transpiles code (the `import` statement)', () => {
    const es6Code = 'import assert from "assert"';
    const es5Code = es6ToEs5Code(es6Code);
    assert.equal(es5Code.includes(es6Code), false, `Expected NOT to contain \`${es6Code}\``);
  });
});
