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

describe('check a given key combo against a shortcut', function() {
  describe('is the same?', function() {
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

  describe('is the start of the shortcut?', function() {
    it('should validate for one key', function() {
      var keys = ['Meta', 'A'];
      var shortcut = createShortcut(keys, someFunction, someString);
      expect(shortcut.isStartOfKeyCombo([keys[0]])).toBe(true);
    });

    describe('should NOT validate', function() {
      it('for only the second key', function() {
        var keys = ['Meta', 'A'];
        var shortcut = createShortcut(keys, someFunction, someString);
        expect(shortcut.isStartOfKeyCombo([keys[1]])).toBe(false);
      });
      it('should NOT validate for different keys', function() {
        var keys = ['Meta', 'A'];
        var shortcut = createShortcut(keys, someFunction, someString);
        expect(shortcut.isStartOfKeyCombo(['Alt', 'B'])).toBe(false);
      });
      it('even Alt+S when Alt+Shift is expected!', function() {
        var keys = ['Alt', 'Shift'];
        var shortcut = createShortcut(keys, someFunction, someString);
        expect(shortcut.isStartOfKeyCombo(['Alt', 'S'])).toBe(false);
      });
    });
  });
});

describe('printable keys', function() {
  it('should be formatted using a given formatter function', function() {
    var keys = ['Meta', 'A'];
    var shortcut = createShortcut(keys, someFunction, someString);
    var spy = jasmine.createSpy().andReturn([]);
    shortcut.setPrintableKeysFormatter(spy);
    shortcut.getPrintableKeys();
    expect(spy).toHaveBeenCalledWith(keys);
  });

  it('should return the string as is if no formatter is given', function() {
    var keys = ['Meta', 'A'];
    var shortcut = createShortcut(keys, someFunction, someString);
    expect(shortcut.getPrintableKeys()).toEqual('Meta+A');
  });
});
