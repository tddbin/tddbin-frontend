import {assert} from '../../_test-helper/assert';
import {RuntimeError} from '../runtime-error';

describe('runtime error', function() {
  it('format it readably', function() {
    var stackTraceDump =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://u/tddbin-frontend/dist/mocha/spec-runner.js:53280:10), <anonymous>:3:1)
    at consumeMessage (http://u/tddbin-frontend/dist/mocha/spec-runner.js:53280:5)
`;
    var sourceCode =
`"use strict";

y++;`;

    var expected =
`  1 | "use strict";
  2 |
> 3 | y++;
      ^`;

    assert.equal(RuntimeError.prettyPrint(stackTraceDump, sourceCode), expected);
  });
});
