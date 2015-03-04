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

//class SourceCodeMarker {
//  constructor(sourceCode) {
//    this.sourceCode = sourceCode;
//  }
//  markAt(position) {
//    var line = position.line;
//  }
//  static prefixWithLineNumber(lineOfSourceCode, lineNumber) {
//    return `  ${lineNumber} | ${lineOfSourceCode}`;
//  }
//}
//SourceCodeMarker.MAX_SURROUNDING_LINES = 3;

describe('SourceCodeMarker', function() {

//  describe(`takes at most ${SourceCodeMarker.MAX_SURROUNDING_LINES} surrounding lines`, function() {
//
//    const markAtPosition = (sourceCode, position) => new SourceCodeMarker(sourceCode).markAt(position);
//
//    var sourceCode =
//`// line 1
//// line 2
//// line 3
//// line 4
//// line 5
//// line 6
//// line 7
//// line 8
//// line 9
//`;
//    it('when enough are given', function() {
//      var expected =
//`  1 | // line 1
//  2 | // line 2
//  3 | // line 3
//> 4 | // line 4
//    |      ^
//  5 | // line 5
//  6 | // line 6
//  7 | // line 7
//`;
//      var result = markAtPosition(sourceCode, {line: 4, column: 5});
//      assert.equal(result, expected);
//    });
//  });
});


