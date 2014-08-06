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

  describe('registering multiple shortcuts', function() {
    it('shall work', function() {
      // TODO simplify the necessary mocking for every shortcut test
      spyOn(browserEventUtil, 'onWindowBlur');
      new util.KeyPressEmulation(keyboardEventUtil);
      var manager = new ShortcutManager();
      spyOn(manager, 'registerShortcut');

      var shortcutMap = [
        [['Meta', 'S'], noop],
        [['Ctrl', 'S'], noop]
      ];
      manager.registerShortcuts(shortcutMap);

      expect(manager.registerShortcut).toHaveBeenCalledWith(shortcutMap[0][0], shortcutMap[0][1]);
      expect(manager.registerShortcut).toHaveBeenCalledWith(shortcutMap[1][0], shortcutMap[1][1]);
    });
  });

});
