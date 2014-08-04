if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  './keyboard-util'
], function(
  keyboardUtil
) {

  function ShortcutManager() {
    keyboardUtil.addKeyDownListener(this._keyDown.bind(this));
    keyboardUtil.addKeyUpListener(this._keyUp.bind(this));
  }
  ShortcutManager.prototype = {
    _pressedKeys: [],
    _registeredShortcuts: [],
    registerShortcut: function(shortcut, callback) {
      this._registeredShortcuts.push([shortcut, callback]);
    },

    _keyDown: function(key) {
      this._pressedKeys.push(key);
    },

    _keyUp: function(keyName) {
      if (keyName != 'Meta') {
        return;
      }
      var pressedKeys = this._pressedKeys;
      var found = this._registeredShortcuts.filter(function(shortcut) {
        return shortcut[0].join('+') == pressedKeys.join('+');
      });
      if (found.length) {
        // Use the first shortcut map found.
        var firstShortcut = found[0];
        firstShortcut[1]();
      }
      this._pressedKeys = [];
    }
  };

  return ShortcutManager;
});
