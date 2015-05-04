import {getShortcutObject, metaKey} from './_util';

var noop = function() {};

export var shortcuts = [
  getShortcutObject([metaKey, 'D'], noop, 'Delete line'),
  getShortcutObject([metaKey, 'Z'], noop, 'Undo'),
  getShortcutObject([metaKey, 'Shift', 'D'], noop, 'Duplicate line'),
  getShortcutObject([metaKey, 'Shift', 'Z'], noop, 'Redo'),
  getShortcutObject([metaKey, '/'], noop, 'Comment in/out line'),
  //
  //getShortcutObject([metaKey, 'I', 'E'], noop, '???'),
  //getShortcutObject([metaKey, 'I', 'I'], noop, '???'),
  //getShortcutObject([metaKey, 'I', 'E', 'E'], noop, '???')
];
