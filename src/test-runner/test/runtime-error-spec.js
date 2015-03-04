import {assert} from '../../_test-helper/assert';

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

    assert.equal(prettyPrint(stackTraceDump, sourceCode), expected);
  });
});

import {StackTrace} from '../stack-trace.js';
import {LinePrefix} from '../line-prefix.js';
import {MarkedLinePrefix} from '../marked-line-prefix.js';

const prettyPrint = (dump, sourceCode) => {
  let stackTrace = new StackTrace(dump);
  let line = stackTrace.lineOfOrigin();
  let column = stackTrace.columnOfOrigin();

  var sourceLines = sourceCode.split('\n');
  var maxDigits = sourceLines.length.toString().length;
  var markedLines = sourceLines.map((sourceLine, idx) => {
    let lineNumber = idx + 1;
    if (lineNumber === line) {
      return MarkedLinePrefix.getPrefix(lineNumber, maxDigits) + sourceLine;
    }
    return LinePrefix.getPrefix(lineNumber, maxDigits) + sourceLine;
  });
  var neew = markedLines.splice(0, line);
  neew = neew.concat('      ^').concat(markedLines);
  return neew.join('\n');
};
