"use strict";

var keyboardEventUtil = require('./keyboard-event-util');
var browserEventUtil = require('./browser-event-util');

function ShortcutManager() {
  this._pressedKeys = [];
  this._registeredShortcuts = [];
  this._allPossibleShortcutStarterKeys = [];
  keyboardEventUtil.addKeyDownListener(this._keyDown.bind(this));
  keyboardEventUtil.addKeyUpListener(this._keyUp.bind(this));
  browserEventUtil.onWindowBlur(this._fireOnShortcutEndCallback.bind(this));
}

ShortcutManager.prototype = {

  _pressedKeys: null,
  _registeredShortcuts: null,
  _allPossibleShortcutStarterKeys: null, // all possible sortcut starter keys
  _firstKeyOfCurrentShortcut: null,
  _onPossibleShortcutCallback: null,
  _onShortcutEndCallback: null,

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

  onPossibleShortcut: function(callback) {
    this._onPossibleShortcutCallback = callback;
  },

  onShortcutEnd: function(callback) {
    this._onShortcutEndCallback = callback;
  },

  _fireOnPossibleShortcutCallback: function() {
    if (this._onPossibleShortcutCallback) {
      this._onPossibleShortcutCallback();
    }
  },

  _fireOnShortcutEndCallback: function() {
    if (this._onShortcutEndCallback) {
      this._onShortcutEndCallback();
    }
  },

  _rememberFirstKey: function(keyName) {
    if (this._allPossibleShortcutStarterKeys.indexOf(keyName) === -1) {
      this._allPossibleShortcutStarterKeys.push(keyName);
    }
  },

  _keyDown: function(keyName) {
    var isStartOfShortcut = this._pressedKeys.length === 0;
    if (isStartOfShortcut) {
      return this._handlePossibleShortcutStart(keyName);
    }
    return this._handleConsecutiveKey(keyName);
  },

  _handlePossibleShortcutStart: function(keyName) {
    var isFirstKeyOfRegisteredShortcut = this._allPossibleShortcutStarterKeys.indexOf(keyName) > -1;
    if (isFirstKeyOfRegisteredShortcut) {
      this._pressedKeys = [keyName];
      this._firstKeyOfCurrentShortcut = keyName;
      this._fireOnPossibleShortcutCallback();
    }
  },

  _handleConsecutiveKey: function(keyName) {
    var isFirstKeyRepition = this._pressedKeys.length === 1 && this._pressedKeys[0] === keyName;
    if (isFirstKeyRepition) {
      return;
    }

    this._pressedKeys.push(keyName);
    this._fireOnPossibleShortcutCallback();

    if (this._isRegisteredShortcut(this._pressedKeys)) {
      return keyboardEventUtil.PREVENT_DEFAULT_ACTION;
    }
    if (!this._isPossibleShortcut(this._pressedKeys)) {
      this._fireOnShortcutEndCallback();
    }
  },

  _isPossibleShortcut: function(keys) {
    var numPossibleShortcuts = this._registeredShortcuts.length;
    for (var i=0; i<numPossibleShortcuts; i++) {
      if ((this._registeredShortcuts[i][0]+'').indexOf(keys+'') === 0) {
        return true;
      }
    }
    return false;
  },

  _keyUp: function(keyName) {
    if (this._isEndOfCurrentShortcut(keyName)) {
      this._fireCallbackForShortcut(this._pressedKeys);
      this._fireOnShortcutEndCallback();
      this._pressedKeys = [];
    }
  },

  _isEndOfCurrentShortcut: function(keyName) {
    return keyName === this._firstKeyOfCurrentShortcut;
  },

  _fireCallbackForShortcut: function(pressedKeys) {
    var callback = this._getCallbackForPressedKeys(pressedKeys);
    if (callback) {
      callback();
    }
  },

  _getCallbackForPressedKeys: function(pressedKeys) {
    function isShortcutSameAsPressedKeys(shortcut) {
      return shortcut[0].join('+') === pressedKeys.join('+');
    }
    var found = this._registeredShortcuts.filter(isShortcutSameAsPressedKeys);
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

module.exports = ShortcutManager;
