var ShortcutProcessor = require('../src/keyboard-shortcut/shortcut-processor');
var Shortcut = require('../src/keyboard-shortcut/shortcut');
var editor = require('ace-with-plugins')('editorNode');

var content = [
  '// This just demonstrates the working editor component (which comes from ace-with-plugins).',
  '// And it shows that connecting shortcuts works.',
  '// If you press Meta+S (or Control+S) watch what happens :)',
  ''
].join('\n');
editor.setContent(content);

// add one shortcut

function onSave() {
  editor.setContent(editor.getContent() + '\nvoid "You pressed the shortuct :)";');
}
var processor = new ShortcutProcessor();
processor.registerShortcuts([
  new Shortcut(['Meta', 'S'], onSave, ''),
  new Shortcut(['Control', 'S'], onSave, '')
]);
