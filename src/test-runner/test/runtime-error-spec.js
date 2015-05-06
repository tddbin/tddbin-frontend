import assert from '../../_test-helper/assert';
import RuntimeError from '../runtime-error';

describe('runtime error', function() {
  let sourceCode;
  let expected;
  let result;
  beforeEach('format it readably', function() {
    let stackTraceDump =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://u/tddbin-frontend/dist/mocha/spec-runner.js:53280:10), <anonymous>:3:1)
    at consumeMessage (http://u/tddbin-frontend/dist/mocha/spec-runner.js:53280:5)
`;
    sourceCode = ['"use strict";', '', 'y++;'];
    expected = ['  1 | "use strict";', '  2 | ', '> 3 | y++;', '       ^'];
    result = RuntimeError.prettyPrint(stackTraceDump, sourceCode.join('\n'));
  });

  it('first line should be prefixed with 1', () => {
    assert.strictEqual(result.split('\n')[0].indexOf('  1 | '), 0);
  });

  it('an empty line should be correct', () => {
    assert.equal(result.split('\n')[1], expected[1]);
  });

  it('column marker should match', () => {
    var lastLine = expected[expected.length - 1];
    var resultLines = result.split('\n');
    assert.equal(resultLines[resultLines.length - 1], lastLine);
  });
});
