var Editor = require('../src/editor/editor');
var ShortcutManager = require('../src/keyboard-shortcut/shortcut-manager');

var editor = new Editor('editorNode');
editor.setContent('// comment');

var manager = new ShortcutManager();
manager.registerShortcut(['Meta', 'S'], function() {
  console.log('save it');
});
