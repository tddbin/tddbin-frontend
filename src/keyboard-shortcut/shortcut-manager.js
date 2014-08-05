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

  ShortcutManager.keyCodeToReadableKeyMap = {
    91: 'Meta',
    83: String.fromCharCode(83),
    73: String.fromCharCode(73)
  };

  ShortcutManager.prototype = {

    _pressedKeys: null,
    _registeredShortcuts: null,

    registerShortcut: function(shortcut, callback) {
      this._registeredShortcuts.push([shortcut, callback]);
    },

    _keyDown: function(keyCode) {
      var keyName = ShortcutManager.keyCodeToReadableKeyMap[keyCode];
      if (keyName == 'Meta') {
        this._pressedKeys = [];
      }
      var keyMap = ShortcutManager.keyCodeToReadableKeyMap;
      this._pressedKeys.push(keyMap[keyCode]);
    },

    _keyUp: function() {
      var callback = this._getCallbackForPressedKeys(this._pressedKeys);
      if (callback) {
        callback();
      }
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
