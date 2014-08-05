if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(function() {

  var keyboardUtil = {
    addKeyDownListener: function(fn) {
      document.addEventListener('keydown', function(evt) {
        fn(evt.keyCode, evt);
      });
    },

    addKeyUpListener: function(fn) {
      document.addEventListener('keyup', function(evt) {
        fn(evt.keyCode);
      });
    }
  };

  return keyboardUtil;
});
