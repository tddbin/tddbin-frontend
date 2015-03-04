import {assert} from '../_test-helper/assert';

describe('runtime error', function() {
//  it('format it readably', function() {
//    var dump =
//`ReferenceError: y is not defined
//    at eval (eval at consumeMessage (http://u/tddbin-frontend/dist/mocha/spec-runner.js:53280:10), <anonymous>:3:1)
//    at consumeMessage (http://u/tddbin-frontend/dist/mocha/spec-runner.js:53280:5)
//`;
//    var es5Code =
//`"use strict";
//
//y++;`;
//
//    var expected =
//`  1 | "use strict";
//  2 |
//> 3 | y++;
//    | ^`;
//
//    assert.equal(RuntimeError.toReadableString(dump, es5Code), expected);
//  });
});

class RuntimeError{}
RuntimeError.toReadableString = function(stackTraceDump, sourceCode) {
  var stackTrace = new StackTrace(stackTraceDump);
  var line = stackTrace.lineOfOrigin();
  var column = stackTrace.columnOfOrigin();
  var position = {line, column};

  markError(sourceCode, position);

  return '';
};

