function Shortcut(keys, fn, helpText) {
  this._keys = keys;
  this._fn = fn;
  this._helpText = helpText;
}

Shortcut.prototype = {

  isStartOfKeyCombo: function(pressedKeys) {
    return this._keys.join('+').indexOf(pressedKeys.join('+')) === 0;
  },

  isKeyCombo: function(pressedKeys) {
    return pressedKeys.join('+') === this._keys.join('+');
  },

  fireAssignedCallback: function() {
    this._fn();
  },

  //getPrintableKeys: function() {
  //  return this._keys.join('+');
  //},

  getHelpText: function() {
    return this._helpText;
  }

};

module.exports = Shortcut;
