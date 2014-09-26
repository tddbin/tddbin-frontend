require('jasmine-matchers');
var Shortcut = require('../shortcut');
/*
- helper function to create a shortcut instance

- provide method to get strings to show for the key combo
- provide method to tell if current key combo matches given shortcut
- get help text method
 */

var someFunction = function() {};
var someString = '';

function createShortcut(shortcut, callback, helpText) {
  return new Shortcut(shortcut, callback, helpText);
}

describe('provide the help text', function() {
  it('via getHelpText()', function() {
    var helpText = 'help text';
    var shortcut = createShortcut([], someFunction, helpText);
    expect(shortcut.getHelpText()).toBe(helpText);
  });
});

describe('fire the callback given to it', function() {
  it('when fireAssignedCallback is called', function() {
    var fn = jasmine.createSpy();
    var shortcut = createShortcut([], fn, someString);
    shortcut.fireAssignedCallback();
    expect(fn).toHaveBeenCalled();
  });
});

ddescribe('check a given key combo against the one of the shortcut', function() {
  it('should validate a shortcut of two keys', function() {
    var keys = ['Meta', 'A'];
    var shortcut = createShortcut(keys, someFunction, someString);
    expect(shortcut.isKeyCombo(keys)).toBe(true);
  });
  it('should validate a shortcut of five keys', function() {
    var keys = ['Meta', 'Shift', 'A', 'B', 'C'];
    var shortcut = createShortcut(keys, someFunction, someString);
    expect(shortcut.isKeyCombo(keys)).toBe(true);
  });

  describe('should invalidate', function() {
    it('an incomplete shortcut', function() {
      var keys = ['Meta', 'A'];
      var shortcut = createShortcut(keys, someFunction, someString);
      expect(shortcut.isKeyCombo([keys[0]])).toBe(false);
    });
    it('a wrong shortcut', function() {
      var keys = ['Meta', 'A'];
      var shortcut = createShortcut(keys, someFunction, someString);
      expect(shortcut.isKeyCombo(['Alt', 'A'])).toBe(false);
    });
  });
});
