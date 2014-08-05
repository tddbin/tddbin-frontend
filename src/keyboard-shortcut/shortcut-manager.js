if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  './keyboard-util'
], function(
  keyboardUtil
) {

  function ShortcutManager() {
    this._pressedKeys = [];
    this._registeredShortcuts = [];
    this._firstKeys = [];
    keyboardUtil.addKeyDownListener(this._keyDown.bind(this));
    keyboardUtil.addKeyUpListener(this._keyUp.bind(this));
  }

  ShortcutManager.keyCodeToReadableKeyMap = {
    17: 'Ctrl',
    18: 'Alt',
    91: 'Meta'
  };
  ShortcutManager.mapKeyCodeToReadable = function(keyCode) {
    var keyCodeMap = ShortcutManager.keyCodeToReadableKeyMap;
    if (keyCode in keyCodeMap) {
      return keyCodeMap[keyCode];
    }
    return String.fromCharCode(keyCode);
  };

  ShortcutManager.prototype = {

    _pressedKeys: null,
    _registeredShortcuts: null,
    _firstKeys: null,

    registerShortcut: function(shortcut, callback) {
      this._registeredShortcuts.push([shortcut, callback]);
      this._rememberFirstKey(shortcut[0]);
    },

    _rememberFirstKey: function(keyName) {
      if (this._firstKeys.indexOf(keyName) == -1) {
        this._firstKeys.push(keyName);
      }
    },

    _keyDown: function(keyCode) {
      var keyName = ShortcutManager.mapKeyCodeToReadable(keyCode);
      var isPossibleFirstKey = this._firstKeys.indexOf(keyName) > -1;
      var isStartOfShortcut = this._pressedKeys.length == 0;
      if (isPossibleFirstKey && isStartOfShortcut) {
        this._pressedKeys = [keyName];
      } else {
        var hasShortcutStartedAlready = this._pressedKeys.length > 0;
        if (hasShortcutStartedAlready) {
          this._pressedKeys.push(keyName);
        }
      }
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
