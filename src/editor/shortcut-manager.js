if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  './keyboard-util'
], function(
  keyboardUtil
) {

  function ShortcutManager() {
    this._pressedKeys = [];
    this._registeredShortcuts = [];
    keyboardUtil.addKeyDownListener(this._keyDown.bind(this));
    keyboardUtil.addKeyUpListener(this._keyUp.bind(this));
  }
  ShortcutManager.prototype = {

    _pressedKeys: null,
    _registeredShortcuts: null,

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
      var callback = this._getCallbackForPressedKeys(this._pressedKeys);
      callback && callback();
      this._pressedKeys = [];
    },

    _getCallbackForPressedKeys: function(pressedKeys) {
      var found = this._registeredShortcuts.filter(function(shortcut) {
        return shortcut[0].join('+') == pressedKeys.join('+');
      });
      if (found.length) {
        // Use the first shortcut map found.
        var firstShortcut = found[0];
        return firstShortcut[1];
      }
      return null;
    }
  };

  return ShortcutManager;
});
