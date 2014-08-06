if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(function() {

  var browserEventUtil = {

    onWindowBlur: function(fn) {
      window.addEventListener('blur', fn);
    }
  };

  return browserEventUtil;
});
