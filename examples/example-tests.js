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

function getSourceFrom(func) {
  var lines = func.toString().split('\n');
  return lines.slice(1, -1).join('\n');
}

module.exports = {
  simplePassingTestCode: getSourceFrom(simplePassing),
  simpleFailingTestCode: getSourceFrom(simpleFailing)
};
