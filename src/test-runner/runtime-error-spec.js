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

describe('StackTrace', function() {

describe('StackTrace', function() {

  describe('get first code position', function() {

    const lineOfOrigin = (stackTrace) => new StackTrace(stackTrace).lineOfOrigin();
    const columnOfOrigin = (stackTrace) => new StackTrace(stackTrace).columnOfOrigin();

        var stackTraceDump =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:42:23)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;
        var stackTraceDump1 =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:11:22)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;

    it('line shall be 42', () => assert.equal(lineOfOrigin(stackTraceDump), 42));
    it('line shall be 11', () => assert.equal(lineOfOrigin(stackTraceDump1), 11));
    it('columne shall be 23', () => assert.equal(columnOfOrigin(stackTraceDump), 23));
    it('columne shall be 22', () => assert.equal(columnOfOrigin(stackTraceDump1), 22));
  });
});

class StackTrace {
  constructor(dump) {
    this.dump = dump;
  }
  lineOfOrigin() {
    var lineNumber = this.firstLineOfDump().split(':');
    return lineNumber[lineNumber.length - 2];
  }
  columnOfOrigin() {
    var lineNumber = this.firstLineOfDump().split(':');
    return parseInt(lineNumber[lineNumber.length - 1]);
  }
  firstLineOfDump() {
    // may look something like this:
    //    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:11:22)
    return this.dump.split('\n')[1];
  }
}
