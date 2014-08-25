var ShortcutManager = require('../shortcut-manager');
var keyboardEventUtil = require('../keyboard-event-util');
var browserEventUtil = require('../browser-event-util');
var util = require('./util');

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
