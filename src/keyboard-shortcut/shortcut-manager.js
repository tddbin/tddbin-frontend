if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  './keyboard-event-util',
  './browser-event-util'
], function(
  keyboardEventUtil,
  browserEventUtil
) {

  function ShortcutManager() {
    this._pressedKeys = [];
    this._registeredShortcuts = [];
    this._firstKeys = [];
    keyboardEventUtil.addKeyDownListener(this._keyDown.bind(this));
    keyboardEventUtil.addKeyUpListener(this._keyUp.bind(this));
    browserEventUtil.onWindowBlur(this._fireOnShortcutEndCallback.bind(this));
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
    _firstKeys: null, // all possible sortcut starter keys
    _shortcutStartKeyName: null, // the key that started the current shortcut

    registerShortcut: function(shortcut, callback) {
      this._registeredShortcuts.push([shortcut, callback]);
      this._rememberFirstKey(shortcut[0]);
    },

    registerShortcuts: function(shortcuts) {
      var self = this;
      shortcuts.forEach(function(shortcutData) {
        self.registerShortcut(shortcutData[0], shortcutData[1]);
      });
    },

    _onPossibleShortcutCallback: null,
    onPossibleShortcut: function(callback) {
      this._onPossibleShortcutCallback = callback;
    },

    _onShortcutEndCallback: null,
    onShortcutEnd: function(callback) {
      this._onShortcutEndCallback = callback;
    },

    _fireOnShortcutEndCallback: function() {
      if (this._onShortcutEndCallback) {
        this._onShortcutEndCallback();
      }
    },

    _rememberFirstKey: function(keyName) {
      if (this._firstKeys.indexOf(keyName) === -1) {
        this._firstKeys.push(keyName);
      }
    },

    _keyDown: function(keyCode) {
      var keyName = ShortcutManager.mapKeyCodeToReadable(keyCode);
      var isAFirstKey = this._firstKeys.indexOf(keyName) > -1;
      var isStartOfShortcut = this._pressedKeys.length === 0;
      if (isAFirstKey && isStartOfShortcut) {
        this._pressedKeys = [keyName];
        this._shortcutStartKeyName = keyName;
        this._onPossibleShortcutCallback && this._onPossibleShortcutCallback();
      } else {
        var hasShortcutStartedAlready = this._pressedKeys.length > 0;
        if (hasShortcutStartedAlready) {
          this._pressedKeys.push(keyName);
          this._onPossibleShortcutCallback && this._onPossibleShortcutCallback();
        }
        if (this._isRegisteredShortcut(this._pressedKeys)) {
          return keyboardEventUtil.PREVENT_DEFAULT_ACTION;
        } else {
          if (this._pressedKeys.length > 0) {
            this._fireOnShortcutEndCallback();
          }
        }
      }
    },

    _keyUp: function(keyCode) {
      var keyName = ShortcutManager.mapKeyCodeToReadable(keyCode);
      if (keyName !== this._shortcutStartKeyName) {
        return;
      }
      var callback = this._getCallbackForPressedKeys(this._pressedKeys);
      if (callback) {
        callback();
      }
      this._pressedKeys = [];
      this._fireOnShortcutEndCallback();
    },

    _getCallbackForPressedKeys: function(pressedKeys) {
      var found = this._registeredShortcuts.filter(function(shortcut) {
        return shortcut[0].join('+') === pressedKeys.join('+');
      });
      if (found.length) {
        // Use the first shortcut map found.
        var firstShortcut = found[0];
        return firstShortcut[1];
      }
      return null;
    },

    _isRegisteredShortcut: function(pressedKeys) {
      return this._getCallbackForPressedKeys(pressedKeys) !== null;
    }
  };

  return ShortcutManager;
});
