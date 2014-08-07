if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(function() {

  var keyboardEventUtil = {

    PREVENT_DEFAULT_ACTION: 'preventDefault',

    _keyCodeToReadableKeyMap: {
      17: 'Control',
      18: 'Alt',
      91: 'Meta'
    },

    _mapKeyCodeToReadable: function(keyCode) {
      var keyCodeMap = keyboardEventUtil._keyCodeToReadableKeyMap;
      if (keyCode in keyCodeMap) {
        return keyCodeMap[keyCode];
      }
      return String.fromCharCode(keyCode);
    },

    addKeyDownListener: function(fn) {
      document.addEventListener('keydown', function(evt) {
        var keyName = keyboardEventUtil._mapKeyCodeToReadable(evt.keyCode);
        var whatToDo = fn(keyName);
        if (whatToDo === keyboardEventUtil.PREVENT_DEFAULT_ACTION) {
          evt.preventDefault();
        }
      });
    },

    addKeyUpListener: function(fn) {
      document.addEventListener('keyup', function(evt) {
        var keyName = keyboardEventUtil._mapKeyCodeToReadable(evt.keyCode);
        fn(keyName);
      });
    }
  };

  return keyboardEventUtil;
});
