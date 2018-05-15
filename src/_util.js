import {toPrintableKeys} from '../src/keyboard-shortcut/util';
import Shortcut from '../src/keyboard-shortcut/shortcut';

const isMac = navigator.platform.indexOf('Mac') === 0;

const map = {
  Meta: '⌘Command',
  Shift: '⇧Shift',
};

const format = function(keys) {
  return toPrintableKeys(keys, map);
};

export const getShortcutObject = function(keys, fn, helpText) {
  const shortcut = new Shortcut(keys, fn, helpText);
  shortcut.printableKeysFormatter = format;
  return shortcut;
};

export const metaKey = isMac ? 'Meta' : 'Control';
