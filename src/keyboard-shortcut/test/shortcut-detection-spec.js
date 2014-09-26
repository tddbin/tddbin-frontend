var Shortcut = require('../shortcut');
var ShortcutProcessor = require('../shortcut-processor');
var keyboardEventUtil = require('../keyboard-event-util');
var browserEventUtil = require('../browser-event-util');
var util = require('./util');

var noop = function() {};

// - register handler when possible shortcut started

describe('a shortcut', function() {

  var processor;
  var shortcutKeys = ['Meta', 'S'];
  var shortcut = new Shortcut(shortcutKeys, noop);
  var keyPressEmulation;
  var blurCallbacks;
  beforeEach(function() {
    // move this out into util.js
    blurCallbacks = [];
    spyOn(browserEventUtil, 'onWindowBlur').andCallFake(function(fn) {
      blurCallbacks.push(fn);
    });

    keyPressEmulation = new util.KeyPressEmulation(keyboardEventUtil);

    processor = new ShortcutProcessor();
    processor.registerShortcut(shortcut);
  });

  describe('onPossibleShortcut() should', function() {
    describe('fire', function() {
      it('started by pressing first key: fire the registered callback', function() {
        var callback = jasmine.createSpy('callback');
        processor.onPossibleShortcut(callback);
        keyPressEmulation.keyDownByKeyName(shortcutKeys[0]);
        expect(callback).toHaveBeenCalled();
      });

      it('started by pressing first key: fire the registered callback with right param', function() {
        var callback = jasmine.createSpy('callback');
        processor.onPossibleShortcut(callback);
        keyPressEmulation.keyDownByKeyName(shortcutKeys[0]);
        expect(callback).toHaveBeenCalledWith([shortcutKeys[0]]);
      });

      it('complete shortcut pressed: the callback shall be called the number of keys in the shortcut', function() {
        var callback = jasmine.createSpy('callback');
        processor.onPossibleShortcut(callback);
        keyPressEmulation.pressByKeyNames(shortcutKeys);
        expect(callback.callCount).toBe(shortcutKeys.length);
      });
    });

    describe('NOT fire', function() {
      it('when unregistered first key of a shortcut was pressed', function() {
        var callback = jasmine.createSpy('callback');
        processor.onPossibleShortcut(callback);
        keyPressEmulation.pressByKeyNames(['Alt']);
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });

  describe('fire onShortcutEnd() callback', function() {

    it('when the shortcut is done', function() {
      var callback = jasmine.createSpy('callback');
      processor.onShortcutEnd(callback);
      keyPressEmulation.pressByKeyNames(shortcutKeys);
      expect(callback).toHaveBeenCalled();
    });

    it('also when shortcut + some other key was pressed (an unregistered shortcut)', function() {
      // e.g. Meta+S is a valid shortcut
      // but  Meta+S+S is pressed, it should fire since the shortcut turned invalid
      var callback = jasmine.createSpy('callback');
      processor.onShortcutEnd(callback);
      var lastKeyName = shortcutKeys[shortcutKeys.length - 1];
      keyPressEmulation.pressByKeyNames(shortcutKeys.concat(lastKeyName));
      expect(callback).toHaveBeenCalled();
    });

    it('when just first key of shortcut was pressed', function() {
      var callback = jasmine.createSpy('callback');
      processor.onShortcutEnd(callback);
      keyPressEmulation.pressByKeyNames([shortcutKeys[0]]);
      expect(callback).toHaveBeenCalled();
    });

    it('when browser window looses focus', function() {
      var callback = jasmine.createSpy('callback');
      processor.onShortcutEnd(callback);
      blurCallbacks[0]();
      expect(callback).toHaveBeenCalled();
    });

    describe('DONT fire', function() {
      it('if its just the first key', function() {
        var callback = jasmine.createSpy('callback');
        processor.onShortcutEnd(callback);
        keyPressEmulation.keyDownByKeyName(shortcutKeys[0]);
        expect(callback).not.toHaveBeenCalled();
      });

      it('if a non-registered shortcut is started', function() {
        var callback = jasmine.createSpy('callback');
        processor.onShortcutEnd(callback);
        keyPressEmulation.pressByKeyNames(['Alt']);
        expect(callback).not.toHaveBeenCalled();
      });

      it('for a three-keys shortcut after ONLY the first 2 keys were pressed', function() {
        var manager = new ShortcutProcessor();
        shortcutKeys = ['Meta', 'Shift', 'S'];
        manager.registerShortcut(shortcutKeys, noop);
        var callback = jasmine.createSpy('callback');

        manager.onShortcutEnd(callback);
        keyPressEmulation.keyDownByKeyNames(shortcutKeys.slice(0, 2));
        expect(callback).not.toHaveBeenCalled();
      });
    });

  });
});
