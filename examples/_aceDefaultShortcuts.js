var _util = require('./_util');

var noop = function() {/* noop() */};

var shortcuts = [
  _util.getShortcutObject([_util.metaKey, 'D'], noop, 'Delete line'),
  _util.getShortcutObject([_util.metaKey, 'Z'], noop, 'Undo'),
  _util.getShortcutObject([_util.metaKey, 'Shift', 'D'], noop, 'Duplicate line'),
  _util.getShortcutObject([_util.metaKey, 'Shift', 'Z'], noop, 'Redo'),
  _util.getShortcutObject([_util.metaKey, '/'], noop, 'Comment in/out line'),

  _util.getShortcutObject([_util.metaKey, 'I', 'E'], noop, '???'),
  _util.getShortcutObject([_util.metaKey, 'I', 'I'], noop, '???'),
  _util.getShortcutObject([_util.metaKey, 'I', 'E', 'E'], noop, '???')
];

module.exports = shortcuts;
