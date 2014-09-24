/*
- when a VALID key combo is pressed
  - show all shortcuts filtered by the keycombo

 */

function getMatchingShortcuts(shortcuts, pressedKeys) {
  if (pressedKeys.length == 0) {
    return [];
  }
  function containsPressedKey(shortcutData) {
    var shortcut = shortcutData[0];
    return pressedKeys.every(function(key, idx) {
      return key == shortcut[idx];
    });
  }
  return shortcuts.filter(containsPressedKey);
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
    expect(getMatchingShortcuts(registeredShortcuts, ['Meta'])).toEqual(registeredShortcuts);
  });

  it('should return all that match', function() {
    var shortcuts = [['Meta', 'S'], ['Meta', 'F']];
    registerShortcuts(shortcuts);
    expect(getMatchingShortcuts(registeredShortcuts, ['Meta'])).toEqual(registeredShortcuts);
  });

  describe('should return only those that match', function() {
    it('when one key pressed', function() {
      var shortcuts = [['Meta', 'S'], ['Ctrl', 'S'], ['Meta', 'F']];
      registerShortcuts(shortcuts);
      var expected = [
        registeredShortcuts[0], registeredShortcuts[2]
      ];
      expect(getMatchingShortcuts(registeredShortcuts, ['Meta'])).toEqual(expected);
    });
    it('when two keys pressed', function() {
      var shortcuts = [['Meta', 'S'], ['Ctrl', 'S'], ['Meta', 'F']];
      registerShortcuts(shortcuts);
      expect(getMatchingShortcuts(registeredShortcuts, ['Ctrl', 'S'])).toEqual([registeredShortcuts[1]]);
    });
  });


});
