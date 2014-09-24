/*
- when NO key combo is pressed yet
- when INVALID key combo is pressed
  - visible shall be false

- when a VALID key combo is pressed
  - show all shortcuts filtered by the keycombo
  - set visible=true

  - pre-process shortcuts into ui-shortcuts (or alike) where 'Meta' is replace by '⌘' etc.

 */

function shallComponentBeVisible(registeredShortcuts, pressedPartialShortcut) {
  var firstPressedKey = pressedPartialShortcut[0];
  return registeredShortcuts.some(function(shortcut) { return shortcut[0][0] == firstPressedKey });
}

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
});
