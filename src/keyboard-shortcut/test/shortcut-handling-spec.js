var ShortcutManager = require('../shortcut-manager');
var keyboardEventUtil = require('../keyboard-event-util');
var browserEventUtil = require('../browser-event-util');
var util = require('./util');

var noop = function() {};

describe('tests suite', function() {
  it('should execute', function() {
    expect(true).toBe(true);
  });
});

describe('keyboard shortcut', function() {
  var callback;
  var keyPressEmulation;
  beforeEach(function() {
    spyOn(browserEventUtil, 'onWindowBlur');
    keyPressEmulation = new util.KeyPressEmulation(keyboardEventUtil);
    callback = jasmine.createSpy('callback');
  });
  function pressKeysAndFinalKeyUp(keyNames) {
    keyPressEmulation.pressByKeyNames(keyNames);
  }

  describe('should fire', function() {
    it('for a two key combo', function() {
      var shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
    it('for a three key combo', function() {
      var shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
    it('also when many are registered', function() {
      var shortcut = ['Meta', 'I', 'I'];
      var unusedShortcut = ['Meta', 'S'];
      mapShortcuts([
        [unusedShortcut, noop],
        [shortcut, callback]
      ]);
      pressKeysAndFinalKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
    it('twice when shortcut is pressed twice', function() {
      var shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      pressKeysAndFinalKeyUp(shortcut);
      expect(callback.callCount).toBe(2);
    });
    it('when part of a shortcut is pressed and full shortcut afterwards', function() {
      var shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp([shortcut[0]]);
      pressKeysAndFinalKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
    it('when shortcut starts not with `Meta`', function() {
      var shortcut = ['Ctrl', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut);
      expect(callback).toHaveBeenCalled();
    });
    it('when invalid shortcut pressed followed by valid shortcut', function() {
      var shortcut = ['Meta', 'I', 'I'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(['A']);
      pressKeysAndFinalKeyUp(shortcut);
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
        pressKeysAndFinalKeyUp(shortcut);
        expect(callback).toHaveBeenCalled();
      });
      it('and invalid keys had been pressed before', function() {
        var shortcut = ['Meta', 'Ctrl', 'S'];
        var shortcut1 = ['Ctrl', 'S'];
        mapShortcuts([
          [shortcut, callback],
          [shortcut1, noop]
        ]);
        pressKeysAndFinalKeyUp(['A', 'B']);
        pressKeysAndFinalKeyUp(shortcut);
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('shoud NOT fire', function() {
    it('before Meta-keyUp', function() {
      var shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      keyPressEmulation.keyDownByKeyNames(shortcut);
      expect(callback).not.toHaveBeenCalled();
    });
    it('for shortcut+extra key was pressed', function() {
      var shortcut = ['Meta', 'S'];
      mapShortcuts([[shortcut, callback]]);
      pressKeysAndFinalKeyUp(shortcut.concat(shortcut[1]));
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
});
