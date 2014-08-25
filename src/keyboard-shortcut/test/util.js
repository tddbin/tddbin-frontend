function KeyPressEmulation(keyboardEventUtil) {
  this._keyDownListeners = [];
  this._keyUpListeners = [];
  var self = this;
  spyOn(keyboardEventUtil, 'addKeyDownListener').andCallFake(function(fn) {
    self._keyDownListeners.push(fn);
  });
  spyOn(keyboardEventUtil, 'addKeyUpListener').andCallFake(function(fn) {
    self._keyUpListeners.push(fn);
  });
}
KeyPressEmulation.prototype = {
  keyDownByKeyName: function(keyName) {
    this._keyDownListeners[0](keyName);
  },

  keyUpByKeyName: function(keyName) {
    this._keyUpListeners[0](keyName);
  },

  keyDownByKeyNames: function(keyNames) {
    keyNames.forEach(this.keyDownByKeyName.bind(this));
  },

  keyUpByKeyNames: function(keyNames) {
    keyNames.forEach(this.keyUpByKeyName.bind(this));
  },

  pressByKeyNames: function(keyNames) {
    // The first key is (normally) the Meta key, don't fire keyUp yet,
    // fire it only at the end of it all.
    var firstKeyName = keyNames[0];
    this._keyDownListeners[0](firstKeyName);

    // Fire all keyDowns and keyUps.
    var self = this;
    keyNames.slice(1).forEach(function(key) {
      self._keyDownListeners[0](key);
      self._keyUpListeners[0](key);
    });

    this.keyUpByKeyName(firstKeyName);
  }

};

module.exports = {
  KeyPressEmulation: KeyPressEmulation
};
