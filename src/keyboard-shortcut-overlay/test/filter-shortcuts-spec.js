/*
- when a VALID key combo is pressed
  - show all shortcuts filtered by the keycombo

 */

function getMatchingShortcuts(shortcuts, pressedKeys) {
  return [];
}

function registerShortcuts(shortcuts) {
  registeredShortcuts = shortcuts.map(function(shortcut) {
    // Register the shortcut and all irrelevenat data.
    return [shortcut, function() {}, shortcut.join(' + ')]
  });
}

var registeredShortcuts = [];

describe('filter shortcuts by given key-combo', function() {
  it('should return none, when nothing pressed', function() {
    registerShortcuts([]);
    expect(getMatchingShortcuts(registeredShortcuts, ['Meta'])).toEqual([]);
  });
});
