function Shortcut(keys, fn, helpText) {
  this._keys = keys;
  this._fn = fn;
  this._helpText = helpText;
}

Shortcut.prototype = {

  isStartOfKeyCombo: function(pressedKeys) {
    var shortcut = this._keys;
    return pressedKeys.every(function(key, idx) {
      return key == shortcut[idx];
    });
  },

  isKeyCombo: function(pressedKeys) {
    return pressedKeys.join('+') === this._keys.join('+');
  },

  process: function() {
    this._fn();
  },

  getKeys: function() {
    return this._keys;
  },

  getCallback: function() {
    return this._fn;
  },

  getPrintableKeys: function() {
    return this._keys.join('+');
  },

  getHelpText: function() {
    return this._helpText;
  }

};

module.exports = Shortcut;
