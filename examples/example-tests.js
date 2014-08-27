"use strict";

function simplePassing() {
  describe('test embedded mocha', function() {
    it('should run jasmine-style tests', function() {
      expect(1)
        .toBe(1);
    });
    it('should run should-style tests', function() {
      should(1).ok;
    });
  });
}

function simpleFailing() {
  describe('test embedded mocha', function() {
    it('should fail', function() {
      expect(1)
        .toBe(2);
    });
  });
}

// Make sure the code block starts with no indentation.
function _replaceTrailingWhitespaces(lines) {
  var firstLineTrailingSpaces = lines[1].match(/^[\s\t]+/);
  if (firstLineTrailingSpaces) {
    lines = lines.map(function(line) {
      return line.replace(firstLineTrailingSpaces, '');
    });
  }
  return lines;
}

function getSourceFrom(func) {
  var lines = func.toString().split('\n');
  lines = _replaceTrailingWhitespaces(lines);
  return lines.slice(1, -1).join('\n');
}

module.exports = {
  simplePassingTestCode: getSourceFrom(simplePassing),
  simpleFailingTestCode: getSourceFrom(simpleFailing)
};
