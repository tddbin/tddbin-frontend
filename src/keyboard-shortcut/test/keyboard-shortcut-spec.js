/*
 * - key combo Meta+S should fire on keyup
 * - key combo Meta+I+I should fire on keyup
 *
 **/

if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  '../shortcut-manager',
  '../keyboard-util'
],function(
  ShortcutManager,
  keyboardUtil
) {

  var noop = function() {};

  describe('tests suite', function() {
    it('should execute', function() {
      expect(true).toBe(true);
    });
  });

  var keyCodeMap = ShortcutManager.keyCodeToReadableKeyMap;
  function toKeyCodes(shortcut) {
    function fromKeyToKeyCode(key) {
      for (var keyCode in keyCodeMap) {
        if (key == keyCodeMap[keyCode]) {
          return keyCode;
        }
      }
    }
    return shortcut.map(fromKeyToKeyCode);
  }

  describe('keyboard shortcut', function() {
    var callback;
    beforeEach(function() {
      callback = jasmine.createSpy('callback');
    });
    it('with one key should call according callback', function() {
      var shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndKeyUp(toKeyCodes(shortcut));
      expect(callback).toHaveBeenCalled();
    });
    it('with two keys should call according callback', function() {
      var shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndKeyUp(toKeyCodes(shortcut));
      expect(callback).toHaveBeenCalled();
    });
    it('multiple registered shortcuts should fire the right one', function() {
      var shortcut = ['Meta', 'I', 'I'];
      var unusedShortcut = ['Meta', 'S'];
      mapShortcuts([
        [unusedShortcut, noop],
        [shortcut, callback]
      ]);
      pressKeysAndKeyUp(toKeyCodes(shortcut));
      expect(callback).toHaveBeenCalled();
    });

    it('NOT starting with `Meta`', function() {
      var shortcut = ['Ctrl', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndKeyUp(toKeyCodes(shortcut));
      expect(callback).toHaveBeenCalled();
    });

    it('invalid shortcut followed by valid shortcut, should fire callback', function() {
      var shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndKeyUp(toKeyCodes(['A']));
      pressKeysAndKeyUp(toKeyCodes(shortcut));
      expect(callback).toHaveBeenCalled();
    });
  });

  

  // test utils

  function mapShortcuts(shortcuts) {
    var manager = new ShortcutManager();
    shortcuts.forEach(function(shortcut) {
      manager.registerShortcut(shortcut[0], shortcut[1]);
    });
  }

  var keyDownListeners;
  var keyUpListeners;

  beforeEach(function() {
    // Initialize for each test.
    keyDownListeners = [];
    keyUpListeners = [];
  });

  spyOn(keyboardUtil, 'addKeyDownListener').andCallFake(function(fn) {
    keyDownListeners.push(fn);
  });
  spyOn(keyboardUtil, 'addKeyUpListener').andCallFake(function(fn) {
    keyUpListeners.push(fn);
  });
  function pressKeysAndKeyUp(keys) {
    // The first key is (normally) the Meta key, don't fire keyUp yet,
    // fire it only at the end of it all.
    var metaKey = keys[0];
    keyDownListeners[0](metaKey);

    // Fire all keyDowns and keyUps.
    keys.slice(1).forEach(function(key) {
      keyDownListeners[0](key);
      keyUpListeners[0](key);
    });

    // The final keyUp (of the Meta key).
    keyUpListeners[0](metaKey);
  }

});
