import assert from '../../_test-helper/assert';
import Shortcut from '../shortcut';
import ShortcutProcessor from '../shortcut-processor';
import {KeyPressEmulation} from './util';

const noop = function() {};

// the shortcut-processor requires browser-event-util which uses `window` that
// fails for those tests ... not fixing it now, skipping tests :(
describe('keyboard shortcut', function() {

  let callback;
  let keyPressEmulation;
  beforeEach(function() {
    keyPressEmulation = new KeyPressEmulation(this.sinon);
    callback = this.sinon.spy();
  });
  function pressKeysAndFinalKeyUp(keyNames) {
    keyPressEmulation.pressByKeyNames(keyNames);
  }

  describe('should fire', () => {
    it('for a two key combo', () => {
      const shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      assert.called(callback);
    });
    it('for a three key combo', () => {
      const shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      assert.called(callback);
    });
    it('also when many are registered', () => {
      const shortcut = ['Meta', 'I', 'I'];
      const unusedShortcut = ['Meta', 'S'];
      mapShortcuts([
        [unusedShortcut, noop],
        [shortcut, callback],
      ]);
      pressKeysAndFinalKeyUp(shortcut);
      assert.called(callback);
    });
    it('twice when shortcut is pressed twice', () => {
      const shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      pressKeysAndFinalKeyUp(shortcut);
      assert.callCount(callback, 2);
    });
    it('when part of a shortcut is pressed and full shortcut afterwards', () => {
      const shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp([shortcut[0]]);
      pressKeysAndFinalKeyUp(shortcut);
      assert.called(callback);
    });
    it('when shortcut starts not with `Meta`', () => {
      const shortcut = ['Ctrl', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      assert.called(callback);
    });
    it('when invalid shortcut pressed followed by valid shortcut', () => {
      const shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(['A']);
      pressKeysAndFinalKeyUp(shortcut);
      assert.called(callback);
    });

    describe('when overlapping shortcuts', () => {
      it('are registered', () => {
        const shortcut = ['Meta', 'Ctrl', 'S'];
        const shortcut1 = ['Ctrl', 'S'];
        mapShortcuts([
          [shortcut, callback],
          [shortcut1, noop],
        ]);
        pressKeysAndFinalKeyUp(shortcut);
        assert.called(callback);
      });
      it('and invalid keys had been pressed before', () => {
        const shortcut = ['Meta', 'Ctrl', 'S'];
        const shortcut1 = ['Ctrl', 'S'];
        mapShortcuts([
          [shortcut, callback],
          [shortcut1, noop],
        ]);
        pressKeysAndFinalKeyUp(['A', 'B']);
        pressKeysAndFinalKeyUp(shortcut);
        assert.called(callback);
      });
    });
  });

  describe('shoud NOT fire', () => {
    it('before Meta-keyUp', () => {
      const shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      keyPressEmulation.keyDownByKeyNames(shortcut);
      assert.notCalled(callback);
    });
    it('for shortcut+extra key was pressed', () => {
      const shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut.concat(shortcut[1]));
      assert.notCalled(callback);
    });
  });

});

function mapShortcuts(shortcuts) {
  const processor = new ShortcutProcessor();
  shortcuts.forEach(shortcut => {
    const keys = shortcut[0];
    const callback = shortcut[1];
    processor.registerShortcut(new Shortcut(keys, callback));
  });
}
