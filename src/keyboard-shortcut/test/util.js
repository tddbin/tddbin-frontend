if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  '../shortcut-manager'
],function(
  ShortcutManager
) {

  var keyCodeMap = ShortcutManager.keyCodeToReadableKeyMap;
  function toKeyCodes(shortcut) {
    function fromKeyToKeyCode(key) {
      for (var keyCode in keyCodeMap) {
        if (key == keyCodeMap[keyCode]) {
          return keyCode;
        }
      }
      return (''+key).charCodeAt(0);
    }
    return shortcut.map(fromKeyToKeyCode);
  }

  return {
    toKeyCodes: toKeyCodes
  }
});
