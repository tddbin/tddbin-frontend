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

    describe('should fire', function() {
      it('for a two key combo', function() {
        var shortcut = ['Meta', 'S'];
        mapShortcuts([[shortcut, callback]]);
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        expect(callback).toHaveBeenCalled();
      });
      it('for a three key combo', function() {
        var shortcut = ['Meta', 'I', 'I'];
        mapShortcuts([[shortcut, callback]]);
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        expect(callback).toHaveBeenCalled();
      });
      it('also when many are registered', function() {
        var shortcut = ['Meta', 'I', 'I'];
        var unusedShortcut = ['Meta', 'S'];
        mapShortcuts([
          [unusedShortcut, noop],
          [shortcut, callback]
        ]);
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        expect(callback).toHaveBeenCalled();
      });
      it('twice when shortcut is pressed twice', function() {
        var shortcut = ['Meta', 'S'];
        mapShortcuts([[shortcut, callback]]);
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        expect(callback.callCount).toBe(2);
      });
      it('when part of a shortcut is pressed and full shortcut afterwards', function() {
        var shortcut = ['Meta', 'S'];
        mapShortcuts([[shortcut, callback]]);
        pressKeysAndFinalKeyUp(toKeyCodes([shortcut[0]]));
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        expect(callback).toHaveBeenCalled();
      });
      it('when shortcut starts not with `Meta`', function() {
        var shortcut = ['Ctrl', 'S'];
        mapShortcuts([[shortcut, callback]]);
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        expect(callback).toHaveBeenCalled();
      });
      it('when invalid shortcut pressed followed by valid shortcut', function() {
        var shortcut = ['Meta', 'I', 'I'];
        mapShortcuts([[shortcut, callback]]);
        pressKeysAndFinalKeyUp(toKeyCodes(['A']));
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
        expect(callback).toHaveBeenCalled();
      });

      describe('when overlapping shortcuts', function() {
        it('are registered', function() {
          var shortcut = ['Meta', 'Ctrl', 'S'];
          var shortcut1 = ['Ctrl', 'S'];
          mapShortcuts([
            [shortcut, callback],
            [shortcut1, noop]
          ]);
          pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
          expect(callback).toHaveBeenCalled();
        });
        it('and invalid keys had been pressed before', function() {
          var shortcut = ['Meta', 'Ctrl', 'S'];
          var shortcut1 = ['Ctrl', 'S'];
          mapShortcuts([
            [shortcut, callback],
            [shortcut1, noop]
          ]);
          pressKeysAndFinalKeyUp(toKeyCodes(['A', 'B']));
          pressKeysAndFinalKeyUp(toKeyCodes(shortcut));
          expect(callback).toHaveBeenCalled();
        });
      });
    });

    describe('shoud NOT fire', function() {
      it('before Meta-keyUp', function() {
        var shortcut = ['Meta', 'S'];
        mapShortcuts([[shortcut, callback]]);
        pressKeys(toKeyCodes(shortcut));
        expect(callback).not.toHaveBeenCalled();
      });
      it('for shortcut+extra key was pressed', function() {
        var shortcut = ['Meta', 'S'];
        mapShortcuts([[shortcut, callback]]);
        pressKeysAndFinalKeyUp(toKeyCodes(shortcut.concat(shortcut[1])));
        expect(callback).not.toHaveBeenCalled();
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

      spyOn(keyboardUtil, 'addKeyDownListener').andCallFake(function(fn) {
        keyDownListeners.push(fn);
      });
      spyOn(keyboardUtil, 'addKeyUpListener').andCallFake(function(fn) {
        keyUpListeners.push(fn);
      });
    });

    function pressKeys(keys) {
      // The first key is (normally) the Meta key, don't fire keyUp yet,
      // fire it only at the end of it all.
      var firstKey = keys[0];
      keyDownListeners[0](firstKey);

      // Fire all keyDowns and keyUps.
      keys.slice(1).forEach(function(key) {
        keyDownListeners[0](key);
        keyUpListeners[0](key);
      });
      return firstKey;
    }

    function finalKeyUp(metaKey) {
      // The final keyUp (of the Meta key).
      keyUpListeners[0](metaKey);
    }

    function pressKeysAndFinalKeyUp(keys) {
      var firstKey = pressKeys(keys);
      finalKeyUp(firstKey);
    }

  });

});
