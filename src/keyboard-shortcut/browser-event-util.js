export const browserEventUtil = {

  onWindowBlur: function(fn) {
    window.addEventListener('blur', fn);
  }
};
