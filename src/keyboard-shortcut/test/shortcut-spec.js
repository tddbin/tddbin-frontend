import assert from '../../_test-helper/assert';
import Shortcut from '../shortcut';

/*
- helper function to create a shortcut instance

- provide method to get strings to show for the key combo
- provide method to tell if current key combo matches given shortcut
- get help text method
 */

const someFunction = function() {};
const someString = '';

function createShortcut(shortcut, callback, helpText) {
  return new Shortcut(shortcut, callback, helpText);
}

describe('provide the help text', () => {
  it('via the helpText property', () => {
    const helpText = 'help text';
    const shortcut = createShortcut([], someFunction, helpText);
    assert.equal(shortcut.helpText, helpText);
  });
});

describe('fire the callback given to it', function() {
  it('when fireAssignedCallback is called', function() {
    const fn = this.sinon.spy();
    const shortcut = createShortcut([], fn, someString);
    shortcut.fireAssignedCallback();
    assert.called(fn);
  });
});

describe('check a given key combo against a shortcut', () => {
  describe('is the same?', () => {
    it('should validate a shortcut of two keys', () => {
      const keys = ['Meta', 'A'];
      const shortcut = createShortcut(keys, someFunction, someString);
      assert.equal(shortcut.isKeyCombo(keys), true);
    });
    it('should validate a shortcut of five keys', () => {
      const keys = ['Meta', 'Shift', 'A', 'B', 'C'];
      const shortcut = createShortcut(keys, someFunction, someString);
      assert.equal(shortcut.isKeyCombo(keys), true);
    });

    describe('should invalidate', () => {
      it('an incomplete shortcut', () => {
        const keys = ['Meta', 'A'];
        const shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isKeyCombo([keys[0]]), false);
      });
      it('a wrong shortcut', () => {
        const keys = ['Meta', 'A'];
        const shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isKeyCombo(['Alt', 'A']), false);
      });
    });
  });

  describe('is the start of the shortcut?', () => {
    it('should validate for one key', () => {
      const keys = ['Meta', 'A'];
      const shortcut = createShortcut(keys, someFunction, someString);
      assert.equal(shortcut.isStartOfKeyCombo([keys[0]]), true);
    });

    describe('should NOT validate', () => {
      it('for only the second key', () => {
        const keys = ['Meta', 'A'];
        const shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isStartOfKeyCombo([keys[1]]), false);
      });
      it('should NOT validate for different keys', () => {
        const keys = ['Meta', 'A'];
        const shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isStartOfKeyCombo(['Alt', 'B']), false);
      });
      it('even Alt+S when Alt+Shift is expected!', () => {
        const keys = ['Alt', 'Shift'];
        const shortcut = createShortcut(keys, someFunction, someString);
        assert.equal(shortcut.isStartOfKeyCombo(['Alt', 'S']), false);
      });
    });
  });
});

describe('printable keys', function() {
  it('should be formatted using a given formatter function', function() {
    const keys = ['Meta', 'A'];
    const shortcut = createShortcut(keys, someFunction, someString);
    const spy = this.sinon.stub().returns([]);
    shortcut.printableKeysFormatter = spy;
    const _ = shortcut.printableKeys; // eslint-disable-line no-unused-vars
    assert.calledWith(spy, keys);
  });

  it('should return the string as is if no formatter is given', () => {
    const keys = ['Meta', 'A'];
    const shortcut = createShortcut(keys, someFunction, someString);
    assert.equal(shortcut.printableKeys, 'Meta+A');
  });
});
