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

  describe('IE specifics', function() {

    var keyPressEmulation;
    beforeEach(function() {
      spyOn(browserEventUtil, 'onWindowBlur');
      keyPressEmulation = new util.KeyPressEmulation(keyboardEventUtil);
    });

    it('ignore multiple consecutive keydown-events for Control, Alt, etc.', function() {
      var callback = jasmine.createSpy('callback');

      var manager = new ShortcutManager();
      manager.registerShortcut(['Control', 'S'], callback);

      // Fire `Control` key as Windows does, multiple times when being held down.
      keyPressEmulation.keyDownByKeyNames(['Control', 'Control', 'Control', 'S']);
      keyPressEmulation.keyUpByKeyNames(['S', 'Control']);

      expect(callback).toHaveBeenCalled();
    });

  });

});
