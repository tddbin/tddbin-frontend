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
    it('should call according callback', function() {
      var callback = jasmine.createSpy('callback');
      var shortcut = ['Meta', 'S'];
      mapShortcut(shortcut, callback);
      pressKeysAndKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
  });
  
});

function mapShortcut(shortcut, callback) {
  var pressedKeys = [];

  function keyDown(key) {
    pressedKeys.push(key);
  }

  function keyUp() {
    if (shortcut.join('+') == pressedKeys.join('+')) {
      callback();
    }
  }
  keyboardUtil.addKeyDownListener(keyDown);
  keyboardUtil.addKeyUpListener(keyUp);
}

var keyboardUtil = {
  addKeyDownListener: function() {},
  addKeyUpListener: function() {}
};

// test utils

var keyDownListeners = [];
var keyUpListeners = [];
spyOn(keyboardUtil, 'addKeyDownListener').andCallFake(function(fn) {
  keyDownListeners.push(fn);
});
spyOn(keyboardUtil, 'addKeyUpListener').andCallFake(function(fn) {
  keyUpListeners.push(fn);
});
function pressKeysAndKeyUp(keys) {
  keys.forEach(function(key) {
    keyDownListeners[0](key);
  });
  keyUpListeners[0] && keyUpListeners[0]();
}
