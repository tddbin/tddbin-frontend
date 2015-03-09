import assert from '../../_test-helper/assert';
import Shortcut from '../shortcut';
import ShortcutProcessor from '../shortcut-processor';
import {keyboardEventUtil} from '../keyboard-event-util';
import {browserEventUtil} from '../browser-event-util';

describe('DOM event handling', function() {

  var keyDownListeners;
  var keyUpListeners;
  beforeEach(function() {
    keyDownListeners = [];
    keyUpListeners = [];
    this.sinon.stub(keyboardEventUtil, 'addKeyDownListener', function(fn) {
      keyDownListeners.push(fn);
    });
    this.sinon.stub(keyboardEventUtil, 'addKeyUpListener', function(fn) {
      keyUpListeners.push(fn);
    });
    this.sinon.stub(browserEventUtil, 'onWindowBlur');
  });

  it('should prevent default when shortcut is `overridden`', function() {
    var shortcut = ['Meta', 'S'];

    var processor = new ShortcutProcessor();
    processor.registerShortcut(new Shortcut(shortcut, function() {}));

    var lastKeyDownReturnValue = pressKeys(shortcut);

    assert.equal(lastKeyDownReturnValue, keyboardEventUtil.PREVENT_DEFAULT_ACTION);
  });

  function pressKeys(shortcut) {
    keyDownListeners[0](shortcut[0]);
    var lastKeyDownReturnValue = keyDownListeners[0](shortcut[1]);

    keyUpListeners[0](shortcut[1]);
    keyUpListeners[0](shortcut[0]);
    return lastKeyDownReturnValue;
  }
});
