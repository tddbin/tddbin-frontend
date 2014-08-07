if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  '../shortcut-manager',
  '../keyboard-event-util',
  '../browser-event-util',
  './util'
],function(
  ShortcutManager,
  keyboardEventUtil,
  browserEventUtil,
  util
) {

  var noop = function() {};

  // - register handler when possible shortcut started

  describe('a shortcut', function() {

    var manager;
    var shortcut = ['Meta', 'S'];
    var keyPressEmulation;
    var blurCallbacks;
    beforeEach(function() {
      // move this out into util.js
      blurCallbacks = [];
      spyOn(browserEventUtil, 'onWindowBlur').andCallFake(function(fn) {
        blurCallbacks.push(fn);
      });

      keyPressEmulation = new util.KeyPressEmulation(keyboardEventUtil);

      manager = new ShortcutManager();
      manager.registerShortcut(shortcut, noop);
    });

    describe('onPossibleShortcut() should', function() {
      describe('fire', function() {
        it('started by pressing first key: fire the registered callback', function() {
          var callback = jasmine.createSpy('callback');
          manager.onPossibleShortcut(callback);
          keyPressEmulation.keyDownByKeyName(shortcut[0]);
          expect(callback).toHaveBeenCalled();
        });

        it('complete shortcut pressed: the callback shall be called the number of keys in the shortcut', function() {
          var callback = jasmine.createSpy('callback');
          manager.onPossibleShortcut(callback);
          keyPressEmulation.pressByKeyNames(shortcut);
          expect(callback.callCount).toBe(shortcut.length);
        });
      });

      describe('NOT fire', function() {
        it('when unregistered first key of a shortcut was pressed', function() {
          var callback = jasmine.createSpy('callback');
          manager.onPossibleShortcut(callback);
          keyPressEmulation.pressByKeyNames(['Alt']);
          expect(callback).not.toHaveBeenCalled();
        });
      });
    });

    describe('fire onShortcutEnd() callback', function(){

      it('when the shortcut is done', function() {
        var callback = jasmine.createSpy('callback');
        manager.onShortcutEnd(callback);
        keyPressEmulation.pressByKeyNames(shortcut);
        expect(callback).toHaveBeenCalled();
      });

      it('also when shortcut + some other key was pressed (an unregistered shortcut)', function() {
        // e.g. Meta+S is a valid shortcut
        // but  Meta+S+S is pressed, it should fire since the shortcut turned invalid
        var callback = jasmine.createSpy('callback');
        manager.onShortcutEnd(callback);
        var lastKeyName = shortcut[shortcut.length-1];
        keyPressEmulation.pressByKeyNames(shortcut.concat(lastKeyName));
        expect(callback).toHaveBeenCalled();
      });

      it('when just first key of shortcut was pressed', function() {
        var callback = jasmine.createSpy('callback');
        manager.onShortcutEnd(callback);
        keyPressEmulation.pressByKeyNames([shortcut[0]]);
        expect(callback).toHaveBeenCalled();
      });

      it('when browser window looses focus', function() {
        var callback = jasmine.createSpy('callback');
        manager.onShortcutEnd(callback);
        blurCallbacks[0]();
        expect(callback).toHaveBeenCalled();
      });

      describe('DONT fire', function() {
        it('if its just the first key', function() {
          var callback = jasmine.createSpy('callback');
          manager.onShortcutEnd(callback);
          keyPressEmulation.keyDownByKeyName(shortcut[0]);
          expect(callback).not.toHaveBeenCalled();
        });

        it('if a non-registered shortcut is started', function() {
          var callback = jasmine.createSpy('callback');
          manager.onShortcutEnd(callback);
          keyPressEmulation.pressByKeyNames(['Alt']);
          expect(callback).not.toHaveBeenCalled();
        });
      });

    });
  });

});
