/*
 * - key combo Meta+S should fire on keyup
 * - key combo Meta+I+I should fire on keyup
 *
 **/

if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(function() {

  describe('tests suite', function() {
    it('should execute', function() {
      expect(true).toBe(true);
    });
  });

  describe('simple keyboard shortcut', function() {
    it('with one key should call according callback', function() {
      var callback = jasmine.createSpy('callback');
      var shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
    it('with two keys should call according callback', function() {
      var callback = jasmine.createSpy('callback');
      var shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
  });
  
});

function ShortcutManager() {
  keyboardUtil.addKeyDownListener(this._keyDown.bind(this));
  keyboardUtil.addKeyUpListener(this._keyUp.bind(this));
}
ShortcutManager.prototype = {
  _pressedKeys: [],
  _registeredShortcuts: [],
  registerShortcut: function(shortcut, callback) {
    this._registeredShortcuts.push([shortcut, callback]);
  },

  _keyDown: function(key) {
    this._pressedKeys.push(key);
  },

  _keyUp: function() {
    var pressedKeys = this._pressedKeys;
    var found = this._registeredShortcuts.filter(function(shortcut) {
      return shortcut[0].join('+') == pressedKeys.join('+');
    });
    if (found.length) {
      // Use the first shortcut map found.
      var firstShortcut = found[0];
      firstShortcut[1]();
    }
    this._pressedKeys = [];
  }
};

var keyboardUtil = {
  addKeyDownListener: function() {},
  addKeyUpListener: function() {}
};

// test utils

function mapShortcuts(shortcuts) {
  var manager = new ShortcutManager();
  shortcuts.forEach(function(shortcut) {
    manager.registerShortcut(shortcut[0], shortcut[1]);
  });
}

var keyDownListeners = [];
var keyUpListeners = [];
spyOn(keyboardUtil, 'addKeyDownListener').andCallFake(function(fn) {
  keyDownListeners.push(fn);
});
spyOn(keyboardUtil, 'addKeyUpListener').andCallFake(function(fn) {
  keyUpListeners.push(fn);
});
function pressKeysAndKeyUp(keys) {
  // The first key is (normally) the Meta key, don't fire keyUp yet,
  // fire it only at the end of it all.
  keyDownListeners[0](keys[0]);

  // Fire all keyDowns and keyUps.
  keys.slice(1).forEach(function(key) {
    keyDownListeners[0](key);
    keyUpListeners[0](key);
  });

  // The final keyUp (of the Meta key).
  keyUpListeners[0]();
}
