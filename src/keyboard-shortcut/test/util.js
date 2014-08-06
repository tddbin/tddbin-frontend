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

  return {
    toKeyCodes: toKeyCodes
  }
});
