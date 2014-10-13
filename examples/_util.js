var toPrintableKeys = require('../src/keyboard-shortcut/util').toPrintableKeys;
var Shortcut = require('../src/keyboard-shortcut/shortcut');

var isMac = navigator.platform.indexOf('Mac') === 0;

var map = {
  Meta: '⌘Command',
  Shift: '⇧Shift'
};

function format(keys) {
  return toPrintableKeys(keys, map);
}

var util = {

  getShortcutObject: function(keys, fn, helpText) {
    var shortcut = new Shortcut(keys, fn, helpText);
    shortcut.setPrintableKeysFormatter(format);
    return shortcut;
  },

  metaKey: isMac ? 'Meta' : 'Control'
};


module.exports = util;
