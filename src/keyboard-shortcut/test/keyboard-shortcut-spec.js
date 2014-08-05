if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  '../shortcut-manager',
  '../keyboard-util',
  './util'
],function(
  ShortcutManager,
  keyboardUtil,
  util
) {

  var noop = function() {};
  var toKeyCodes = util.toKeyCodes;

  describe('tests suite', function() {
    it('should execute', function() {
      expect(true).toBe(true);
    });
  });

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
    it('overlapping shortcuts', function() {
      var shortcut = ['Meta', 'Ctrl', 'S'];
      var shortcut1 = ['Ctrl', 'S'];
      mapShortcuts([
        [shortcut, callback],
        [shortcut1, noop]
      ]);
      pressKeysAndKeyUp(toKeyCodes(shortcut));
      expect(callback).toHaveBeenCalled();
    });
    it('overlapping shortcuts and invalid keys before', function() {
      var shortcut = ['Meta', 'Ctrl', 'S'];
      var shortcut1 = ['Ctrl', 'S'];
      mapShortcuts([
        [shortcut, callback],
        [shortcut1, noop]
      ]);
      pressKeysAndKeyUp(toKeyCodes(['A', 'B']));
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

  describe('DOM event handling', function() {
    it('should prevent default when shortcut is `overridden`', function() {

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
