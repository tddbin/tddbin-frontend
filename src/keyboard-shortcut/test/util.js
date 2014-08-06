if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  '../shortcut-manager'
],function(
  ShortcutManager
) {

  var keyCodeMap = ShortcutManager.keyCodeToReadableKeyMap;

  function fromKeyNameToKeyCode(keyName) {
    for (var keyCode in keyCodeMap) {
      if (keyName == keyCodeMap[keyCode]) {
        return keyCode;
      }
    }
    return (''+keyName).charCodeAt(0);
  }

  function toKeyCodes(keyNames) {
    return keyNames.map(fromKeyNameToKeyCode);
  }

  function KeyPressEmulation(keyboardUtil) {
    this._keyDownListeners = [];
    this._keyUpListeners = [];
    var self = this;
    spyOn(keyboardUtil, 'addKeyDownListener').andCallFake(function(fn) {
      self._keyDownListeners.push(fn);
    });
    spyOn(keyboardUtil, 'addKeyUpListener').andCallFake(function(fn) {
      self._keyUpListeners.push(fn);
    });
  }
  KeyPressEmulation.prototype = {
    keyDownByKeyName: function(keyName) {
      this._keyDownListeners[0](fromKeyNameToKeyCode(keyName));
    }
  };

  return {
    toKeyCodes: toKeyCodes,
    KeyPressEmulation: KeyPressEmulation
  }
});
