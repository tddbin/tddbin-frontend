var ShortcutManager = require('../shortcut-manager');
var keyboardEventUtil = require('../keyboard-event-util');
var browserEventUtil = require('../browser-event-util');

describe('DOM event handling', function() {

  var keyDownListeners;
  var keyUpListeners;
  beforeEach(function() {
    keyDownListeners = [];
    keyUpListeners = [];
    spyOn(keyboardEventUtil, 'addKeyDownListener').andCallFake(function(fn) {
      keyDownListeners.push(fn);
    });
    spyOn(keyboardEventUtil, 'addKeyUpListener').andCallFake(function(fn) {
      keyUpListeners.push(fn);
    });
    spyOn(browserEventUtil, 'onWindowBlur');
  });

  it('should prevent default when shortcut is `overridden`', function() {
    var shortcut = ['Meta', 'S'];

    var manager = new ShortcutManager();
    manager.registerShortcut(shortcut, function() {});

    var lastKeyDownReturnValue = pressKeys(shortcut);

    expect(lastKeyDownReturnValue).toBe(keyboardEventUtil.PREVENT_DEFAULT_ACTION);
  });

  function pressKeys(shortcut) {
    keyDownListeners[0](shortcut[0]);
    var lastKeyDownReturnValue = keyDownListeners[0](shortcut[1]);

    keyUpListeners[0](shortcut[1]);
    keyUpListeners[0](shortcut[0]);
    return lastKeyDownReturnValue;
  }
});
