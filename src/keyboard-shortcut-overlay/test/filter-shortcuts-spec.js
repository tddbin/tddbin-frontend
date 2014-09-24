/*
- when a VALID key combo is pressed
  - show all shortcuts filtered by the keycombo

 */

function getMatchingShortcuts(shortcuts, pressedKeys) {
  if (pressedKeys.length) {
    return shortcuts[0][0];
  }
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
    registerShortcuts([['Meta']]);
    expect(getMatchingShortcuts(registeredShortcuts, [])).toEqual([]);
  });

  it('should return just the one that matches', function() {
    var shortcut = ['Meta', 'S'];
    registerShortcuts([shortcut]);
    expect(getMatchingShortcuts(registeredShortcuts, ['Meta'])).toEqual(shortcut);
  });


});
