import {toPrintableKeys} from '../src/keyboard-shortcut/util';
import Shortcut from '../src/keyboard-shortcut/shortcut';

var isMac = navigator.platform.indexOf('Mac') === 0;

var map = {
  Meta: '⌘Command',
  Shift: '⇧Shift'
};

function format(keys) {
  return toPrintableKeys(keys, map);
}

export const util = {

  getShortcutObject: function(keys, fn, helpText) {
    var shortcut = new Shortcut(keys, fn, helpText);
    shortcut.setPrintableKeysFormatter(format);
    return shortcut;
  },

  metaKey: isMac ? 'Meta' : 'Control'
};
