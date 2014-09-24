var viewData = {
  getMatchingShortcuts: function(shortcuts, pressedKeys) {
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
  },

  shallComponentBeVisible: function(registeredShortcuts, pressedPartialShortcut) {
    if (pressedPartialShortcut.length == 0) {
      return false;
    }
    function containsPressedKey(shortcutData) {
      var shortcut = shortcutData[0];
      return pressedPartialShortcut.every(function(key, idx) {
        return key == shortcut[idx];
      });
    }
    return registeredShortcuts.some(containsPressedKey);
  }
};

module.exports = viewData;
