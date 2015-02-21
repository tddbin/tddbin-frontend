'use strict';

export var keyboardEventUtil = {

  PREVENT_DEFAULT_ACTION: 'preventDefault',

  _keyCodeToReadableKeyMap: {
    16: 'Shift',
    17: 'Control',
    18: 'Alt',
    91: 'Meta', // Seems not to be correct in FF, but FF supports evt.key
    117: 'F6'
  },

  _mapKeyCodeToReadable: function(keyCode) {
    var keyCodeMap = keyboardEventUtil._keyCodeToReadableKeyMap;
    if (keyCode in keyCodeMap) {
      return keyCodeMap[keyCode];
    }
    return String.fromCharCode(keyCode);
  },

  _getKeyNameFromEvent: function(evt) {
    if (evt.key) {
      // Ctrl+S in FF reports evt.key='s' (which makes sense) but we handle all just in upper case.
      if (evt.key.length === 1) {
        return evt.key.toUpperCase();
      }
      return evt.key;
    }
    return keyboardEventUtil._mapKeyCodeToReadable(evt.keyCode);
  },

  addKeyDownListener: function(fn) {
    document.addEventListener('keydown', function(evt) {
      var whatToDo = fn(keyboardEventUtil._getKeyNameFromEvent(evt));
      if (whatToDo === keyboardEventUtil.PREVENT_DEFAULT_ACTION) {
        evt.preventDefault();
      }
    });
  },

  addKeyUpListener: function(fn) {
    document.addEventListener('keyup', function(evt) {
      fn(keyboardEventUtil._getKeyNameFromEvent(evt));
    });
  }
};
