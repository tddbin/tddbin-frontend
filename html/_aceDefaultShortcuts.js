import {util} from './_util';

var noop = function() {};

export var shortcuts = [
  util.getShortcutObject([util.metaKey, 'D'], noop, 'Delete line'),
  util.getShortcutObject([util.metaKey, 'Z'], noop, 'Undo'),
  util.getShortcutObject([util.metaKey, 'Shift', 'D'], noop, 'Duplicate line'),
  util.getShortcutObject([util.metaKey, 'Shift', 'Z'], noop, 'Redo'),
  util.getShortcutObject([util.metaKey, '/'], noop, 'Comment in/out line'),
  //
  //util.getShortcutObject([util.metaKey, 'I', 'E'], noop, '???'),
  //util.getShortcutObject([util.metaKey, 'I', 'I'], noop, '???'),
  //util.getShortcutObject([util.metaKey, 'I', 'E', 'E'], noop, '???')
];
