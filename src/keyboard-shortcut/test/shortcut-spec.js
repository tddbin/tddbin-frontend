'use strict';

import {assert} from '../../_test-helper/assert';
import {Shortcut} from '../shortcut';

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
    assert.equal(shortcut.getHelpText(), helpText);
  });
});

describe('fire the callback given to it', function() {
  it('when fireAssignedCallback is called', function() {
    var fn = this.sinon.spy();
    var shortcut = createShortcut([], fn, someString);
    shortcut.fireAssignedCallback();
    assert.called(fn);
  });
});

describe('check a given key combo against a shortcut', function() {
  describe('is the same?', function() {
    it('should validate a shortcut of two keys', function() {
      var keys = ['Meta', 'A'];
      var shortcut = createShortcut(keys, someFunction, someString);
      assert.equal(shortcut.isKeyCombo(keys), true);
    });
    it('should validate a shortcut of five keys', function() {
      var keys = ['Meta', 'Shift', 'A', 'B', 'C'];
      var shortcut = createShortcut(keys, someFunction, someString);
      assert.equal(shortcut.isKeyCombo(keys), true);
    });

    describe('should invalidate', function() {
      it('an incomplete shortcut', function() {
        var keys = ['Meta', 'A'];
        var shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isKeyCombo([keys[0]]), false);
      });
      it('a wrong shortcut', function() {
        var keys = ['Meta', 'A'];
        var shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isKeyCombo(['Alt', 'A']), false);
      });
    });
  });

  describe('is the start of the shortcut?', function() {
    it('should validate for one key', function() {
      var keys = ['Meta', 'A'];
      var shortcut = createShortcut(keys, someFunction, someString);
      assert.equal(shortcut.isStartOfKeyCombo([keys[0]]), true);
    });

    describe('should NOT validate', function() {
      it('for only the second key', function() {
        var keys = ['Meta', 'A'];
        var shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isStartOfKeyCombo([keys[1]]), false);
      });
      it('should NOT validate for different keys', function() {
        var keys = ['Meta', 'A'];
        var shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isStartOfKeyCombo(['Alt', 'B']), false);
      });
      it('even Alt+S when Alt+Shift is expected!', function() {
        var keys = ['Alt', 'Shift'];
        var shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isStartOfKeyCombo(['Alt', 'S']), false);
      });
    });
  });
});

describe('printable keys', function() {
  it('should be formatted using a given formatter function', function() {
    var keys = ['Meta', 'A'];
    var shortcut = createShortcut(keys, someFunction, someString);
    var spy = this.sinon.stub().returns([]);
    shortcut.setPrintableKeysFormatter(spy);
    shortcut.getPrintableKeys();
    assert.calledWith(spy, keys);
  });

  it('should return the string as is if no formatter is given', function() {
    var keys = ['Meta', 'A'];
    var shortcut = createShortcut(keys, someFunction, someString);
    assert.equal(shortcut.getPrintableKeys(), 'Meta+A');
  });
});
