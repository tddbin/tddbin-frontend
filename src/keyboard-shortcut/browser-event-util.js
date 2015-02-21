'use strict';

export var browserEventUtil = {

  onWindowBlur: function(fn) {
    window.addEventListener('blur', fn);
  }
};
