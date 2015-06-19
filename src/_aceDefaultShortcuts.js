import {createShortcutObject, metaKey} from './_util';

var noop = function() {};

export var shortcuts = [
  createShortcutObject([metaKey, 'D'], noop, 'Delete line'),
  createShortcutObject([metaKey, 'Z'], noop, 'Undo'),
  createShortcutObject([metaKey, 'Shift', 'D'], noop, 'Duplicate line'),
  createShortcutObject([metaKey, 'Shift', 'Z'], noop, 'Redo'),
  createShortcutObject([metaKey, '/'], noop, 'Comment in/out line')
  //
  //createShortcutObject([metaKey, 'I', 'E'], noop, '???'),
  //createShortcutObject([metaKey, 'I', 'I'], noop, '???'),
  //createShortcutObject([metaKey, 'I', 'E', 'E'], noop, '???')
];
