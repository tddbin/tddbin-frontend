import assert from '../../_test-helper/assert';
import Shortcut from '../shortcut';
import ShortcutProcessor from '../shortcut-processor';
import {keyboardEventUtil} from '../keyboard-event-util';
import {keyDownStub, keyUpStub} from './util';

describe('DOM event handling', function() {

  let keyDownListeners;
  let keyUpListeners;
  beforeEach(function() {
    keyDownListeners = [];
    keyUpListeners = [];
    keyDownStub.callsFake(function(fn) {
      keyDownListeners.push(fn);
    });
    keyUpStub.callsFake(function(fn) {
      keyUpListeners.push(fn);
    });
  });

  it('should prevent default when shortcut is `overridden`', () => {
    const shortcut = ['Meta', 'S'];

    const processor = new ShortcutProcessor();
    processor.registerShortcut(new Shortcut(shortcut, () => {}));

    const lastKeyDownReturnValue = pressKeys(shortcut);

    assert.equal(lastKeyDownReturnValue, keyboardEventUtil.PREVENT_DEFAULT_ACTION);
  });

  function pressKeys(shortcut) {
    keyDownListeners[0](shortcut[0]);
    const lastKeyDownReturnValue = keyDownListeners[0](shortcut[1]);

    keyUpListeners[0](shortcut[1]);
    keyUpListeners[0](shortcut[0]);
    return lastKeyDownReturnValue;
  }
});
