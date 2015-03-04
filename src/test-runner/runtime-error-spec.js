import {assert} from '../_test-helper/assert';

describe('runtime error', function() {
//  it('format it readably', function() {
//    var stackTrace =
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
//    assert.equal(RuntimeError.toReadableString(stackTrace, es5Code), expected);
//  });
});

class RuntimeError{}
RuntimeError.toReadableString = function(stackTrace, sourceCode) {
  //var position = getPositionFromStackTrace();
  return '';
};

describe('StackTrace', function() {
  describe('get first code position', function() {
        var stackTrace =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:42:23)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;
        var stackTrace1 =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:11:22)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;

    it('line shall be 42', () => assert.equal(getFirstCodeLine(stackTrace), 42));
    it('line shall be 11', () => assert.equal(getFirstCodeLine(stackTrace1), 11));
    it('columne shall be 23', () => assert.equal(getFirstCodeColumn(stackTrace), 23));
    //it('line shall be 11', () => assert.equal(getFirstCodeLine(stackTrace1), 11));
  });
});

const getFirstCodeLine = (stackTrace) => StackTrace.getFirstCodeLine(stackTrace);
const getFirstCodeColumn = (stackTrace) => StackTrace.getFirstCodeColumn(stackTrace);

class StackTrace{}
StackTrace.getFirstCodePosition = () => {

};
StackTrace.getFirstCodeLine = (stackTrace) => {
  var firstLine = stackTrace.split('\n')[1];
  var lineNumber = firstLine.split(':');
  return lineNumber[lineNumber.length - 2];
};
StackTrace.getFirstCodeColumn = (stackTrace) => {
  var firstLine = stackTrace.split('\n')[1];
  var lineNumber = firstLine.split(':');
  return parseInt(lineNumber[lineNumber.length - 1]);
};
