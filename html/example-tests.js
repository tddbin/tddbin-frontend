"use strict";

export const simplePassingTestCode = [
//',
'// !!!! this is a new version !!!!',
'// this runner below is mocha, with should and assert as assertion libs',
'// for any problem, etc. please tweet to @tddbin',
'//',
'describe(\'test embedded mocha\', function() {',
'  // doesnt work anymore since we use mocha from the CDN, which we have to do due to',
'  // browserify failing when bundling mocha :(',
'  //it(\'should run jasmine-style tests (using referee)\', function() {',
'  //  var expected = 1;',
'  //  expect(expected)',
'  //    .toBe(expected);',
'  //});',
'  it(\'should run should-style tests\', function() {',
'    var expected = 1;',
'    should(expected).ok;',
'  });',
'  it(\'should run assert-style tests\', function() {',
'    var expected = 1;',
'    assert.equal(expected, 1);',
'  });',
'  it(\'ES6 class works?\', function() {',
'    assert.equal(new Es6Class().x, 42);',
'  });',
'});',
'',
'class Es6Class {',
'  constructor() {',
'    this.x = 42;',
'  }',
'}'
].join('\n');

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

export var simpleFailingTestCode = getSourceFrom(simpleFailing);
