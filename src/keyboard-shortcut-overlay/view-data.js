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

  shallComponentBeVisible: function(shortcuts, pressedKeys) {
    return viewData.getMatchingShortcuts(shortcuts, pressedKeys).length > 0;
  }
};

module.exports = viewData;
