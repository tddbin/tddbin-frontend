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

class LinePrefix {
  static getPrefix(lineNumber, maxDigits) {
    let leadingSpaces = getLeadingSpaces(lineNumber, maxDigits);
    return `${getSpaces(leadingSpaces)}${lineNumber} | `;
  }
}

const DEFAULT_LEADING_SPACE = 2;

const getLeadingSpaces = (number, maxDigits) => {
  var numberLength = number.toString().length;
  return DEFAULT_LEADING_SPACE + maxDigits - numberLength;
};

const getSpaces = (howMany) => {
  return new Array(howMany + 1).join(' ');
};

describe('LinePrefix', function() { // there must be a function here so we don't inherit `this` from global :)

  const getPrefix = LinePrefix.getPrefix;

  describe('for max one digit line numbers', () => {
    beforeEach(() => { this.maxDigits = 1; });
    it('line number 1', () => assert.equal(getPrefix(1, this.maxDigits), '  1 | '));
    it('line number 9', () => assert.equal(getPrefix(9, this.maxDigits), '  9 | '));
  });
  describe('for max two digit line numbers', () => {
    beforeEach(() => { this.maxDigits = 2; });
    it('line number 1', () => assert.equal(getPrefix(1, this.maxDigits), '   1 | '));
    it('line number 19', () => assert.equal(getPrefix(19, this.maxDigits), '  19 | '));
  });
  describe('for max three digit line numbers', () => {
    beforeEach(() => { this.maxDigits = 3; });
    it('line number 1', () => assert.equal(getPrefix(1, this.maxDigits), '    1 | '));
    it('line number 99', () => assert.equal(getPrefix(99, this.maxDigits), '   99 | '));
    it('line number 100', () => assert.equal(getPrefix(100, this.maxDigits), '  100 | '));
  });
});




class MarkedLinePrefix extends LinePrefix {
  static getPrefix() {
    var defaultPrefix = LinePrefix.getPrefix(...arguments).substr(1);
    return `>${defaultPrefix}`;
  }
}

describe('MarkedLinePrefix', () => {

  const getPrefix = MarkedLinePrefix.getPrefix;

  describe('has the `>` in front', () => {
    it('line number 1', () => assert.equal(getPrefix(1, 1), '> 1 | '));
    it('line number 1234', () => assert.equal(getPrefix(1234, 4), '> 1234 | '));
  });
});

