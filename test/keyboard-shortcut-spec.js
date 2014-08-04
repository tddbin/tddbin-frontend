/*
 * - key combo Meta+S should fire on keyup
 * - key combo Meta+I+I should fire on keyup
 *
 **/

if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  '../src/editor/shortcut-manager',
  '../src/editor/keyboard-util'
],function(
  ShortcutManager,
  keyboardUtil
) {

  describe('tests suite', function() {
    it('should execute', function() {
      expect(true).toBe(true);
    });
  });

  describe('keyboard shortcut', function() {
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
    it('multiple registered shortcuts shold work too', function() {
      var callback = jasmine.createSpy('callback');
      var shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([
        [['Meta', 'S'], function() {}],
        [shortcut, callback]
      ]);
      pressKeysAndKeyUp(shortcut);
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
