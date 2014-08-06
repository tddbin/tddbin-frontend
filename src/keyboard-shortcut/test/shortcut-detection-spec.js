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

  // - register handler when possible shortcut started

  describe('a shortcut', function() {

    var manager;
    var shortcut = ['Meta', 'S'];
    var keyPressEmulation;
    beforeEach(function() {
      keyPressEmulation = new util.KeyPressEmulation(keyboardUtil);
      manager = new ShortcutManager();
      manager.registerShortcut(shortcut, noop);
    });

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

      it('DONT fire if its just the first key', function() {
        var callback = jasmine.createSpy('callback');
        manager.onShortcutEnd(callback);
        keyPressEmulation.keyDownByKeyName(shortcut[0]);
        expect(callback).not.toHaveBeenCalled();
      });

    });
  });

});
