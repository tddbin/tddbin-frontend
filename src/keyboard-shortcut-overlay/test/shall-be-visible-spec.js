/*
- when NO key combo is pressed yet
- when INVALID key combo is pressed
  - visible shall be false

- when a VALID key combo is pressed
  - set visible=true
 */
var shallComponentBeVisible = require('../view-data').shallComponentBeVisible;

function registerShortcuts(shortcuts) {
  registeredShortcuts = shortcuts.map(function(shortcut) {
    // Register the shortcut and all irrelevenat data.
    return [shortcut, function() {}, shortcut.join(' + ')]
  });
}

var registeredShortcuts = [];

describe('NO key combo is pressed yet', function() {
  it('should tell component NOT to be visible', function() {
    var keyCombo = [];
    var visible = shallComponentBeVisible(registeredShortcuts, keyCombo);
    expect(visible).toBe(false);
  });
});

describe('VALID first key of key combo is pressed', function() {

  describe('should tell component to be visible', function() {
    it('first registered shortcut matches', function() {
      registerShortcuts([['Meta', 'S']]);
      var isVisible = shallComponentBeVisible(registeredShortcuts, ['Meta']);
      expect(isVisible).toBe(true);
    });
    it('some registered shortcut matches', function() {
      registerShortcuts([['useless'], ['irrelevant'], ['Shift', 'F6']]);
      var isVisible = shallComponentBeVisible(registeredShortcuts, ['Shift']);
      expect(isVisible).toBe(true);
    });
  });

  it('invalid second key => component NOT visible', function() {
    registerShortcuts([['useless'], ['irrelevant'], ['Shift', 'Ctrl', 'F6']]);
    var isVisible = shallComponentBeVisible(registeredShortcuts, ['Shift', 'Alt']);
    expect(isVisible).toBe(false);
  });
});

describe('more keys of key combo pressed', function() {

  describe('if start of a registered shortcut, say component visible', function() {
    it('two keys', function() {
      registerShortcuts([['useless'], ['irrelevant'], ['Shift', 'Alt', 'F6']]);
      var isVisible = shallComponentBeVisible(registeredShortcuts, ['Shift', 'Alt']);
      expect(isVisible).toBe(true);
    });
    it('four keys', function() {
      registerShortcuts([['useless'], ['irrelevant'], ['Shift', 'Alt', 'Ctrl', 'Meta', 'F6']]);
      var isVisible = shallComponentBeVisible(registeredShortcuts, ['Shift', 'Alt', 'Ctrl', 'Meta']);
      expect(isVisible).toBe(true);
    });
  });

  describe('if NOT start of a registered shortcut, say component NOT visible', function() {
    it('four keys', function() {
      registerShortcuts([['useless'], ['irrelevant'], ['Shift', 'Alt', 'Ctrl', 'Meta', 'F6']]);
      var isVisible = shallComponentBeVisible(registeredShortcuts, ['Shift', 'Alt', 'Ctrl', 'Not Meta']);
      expect(isVisible).toBe(false);
    });
    it('mix of parts from various key combos, but no actual registered one', function() {
      var key1 = 'One';
      var key2 = 'Dos';
      registerShortcuts([[key1, 'Two', 'Three'], ['Uno', key2, 'Tres']]);
      var isVisible = shallComponentBeVisible(registeredShortcuts, [key1, key2]);
      expect(isVisible).toBe(false);
    });
  });
});
