'use strict';

var browserEventUtil = {

  onWindowBlur: function(fn) {
    window.addEventListener('blur', fn);
  }
};

module.exports = browserEventUtil;
