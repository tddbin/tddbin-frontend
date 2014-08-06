if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  '../shortcut-manager',
  '../keyboard-util',
  './util'
],function(
  ShortcutManager,
  keyboardUtil,
  util
) {

  var toKeyCodes = util.toKeyCodes;

  describe('DOM event handling', function() {

    var keyDownListeners;
    var keyUpListeners;
    beforeEach(function() {
      keyDownListeners = [];
      keyUpListeners = [];
      spyOn(keyboardUtil, 'addKeyDownListener').andCallFake(function(fn) {
        keyDownListeners.push(fn);
      });
      spyOn(keyboardUtil, 'addKeyUpListener').andCallFake(function(fn) {
        keyUpListeners.push(fn);
      });
    });

    it('should prevent default when shortcut is `overridden`', function() {
      var shortcut = ['Meta', 'S'];

      var manager = new ShortcutManager();
      manager.registerShortcut(shortcut, function() {});

      var lastKeyDownReturnValue = pressKeys(shortcut);

      expect(lastKeyDownReturnValue).toBe(keyboardUtil.PREVENT_DEFAULT_ACTION);
    });

    function pressKeys(shortcut) {
      keyDownListeners[0](toKeyCodes([shortcut[0]]));
      var lastKeyDownReturnValue = keyDownListeners[0](toKeyCodes([shortcut[1]]));

      keyUpListeners[0](toKeyCodes([shortcut[1]]));
      keyUpListeners[0](toKeyCodes([shortcut[0]]));
      return lastKeyDownReturnValue;
    }
  });

});
