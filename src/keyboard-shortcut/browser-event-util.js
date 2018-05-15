export const browserEventUtil = {
  onWindowBlur(fn) {
    window.addEventListener('blur', fn);
  },
};
