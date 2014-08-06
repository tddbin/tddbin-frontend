if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(function() {

  var keyboardEventUtil = {

    PREVENT_DEFAULT_ACTION: 'preventDefault',

    addKeyDownListener: function(fn) {
      document.addEventListener('keydown', function(evt) {
        var whatToDo = fn(evt.keyCode);
        if (whatToDo === keyboardEventUtil.PREVENT_DEFAULT_ACTION) {
          evt.preventDefault();
        }
      });
    },

    addKeyUpListener: function(fn) {
      document.addEventListener('keyup', function(evt) {
        fn(evt.keyCode);
      });
    }
  };

  return keyboardEventUtil;
});
