var Editor = require('../src/editor/editor');
var ShortcutProcessor = require('../src/keyboard-shortcut/shortcut-processor');

var editor = new Editor('editorNode');
editor.setContent([
  '// This just demonstrates the working editor component.',
  '// If you press Meta+S `save it` should be console logged.'
].join('\n'));

var manager = new ShortcutProcessor();
manager.registerShortcut(['Meta', 'S'], function() {
  console.log('save it');
});
