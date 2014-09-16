var Editor = require('../src/editor/editor');
var ShortcutManager = require('../src/keyboard-shortcut/shortcut-manager');

var editor = new Editor('editorNode');
editor.setContent([
  '// This just demonstrates the working editor component.',
  '// If you press Meta+S `save it` should be console logged.'
].join('\n'));

var manager = new ShortcutManager();
manager.registerShortcut(['Meta', 'S'], function() {
  console.log('save it');
});
