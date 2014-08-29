var exampleTests = require('./example-tests');

var MochaRunner = require('../src/test-runner/mocha/runner');
var Editor = require('../src/editor/editor');
var ShortcutManager = require('../src/keyboard-shortcut/shortcut-manager');
var ShortcutOverlay = require('../src/keyboard-shortcut-overlay/overlay');

var $ = document.getElementById.bind(document);
var editor = new Editor('editorNode');
editor.setContent(exampleTests.simplePassingTestCode);

var domNode = $('embeddedMocha');
var runner = new MochaRunner(domNode);
var iframeSrc = '../src/test-runner/mocha/spec-runner.html';
runner.render(iframeSrc);

var executeTestCode = function() {
  runner.send(editor.getContent());
};
document.getElementById('runTestsButton').addEventListener('click', executeTestCode);

var isMac = navigator.platform.indexOf('Mac') === 0;
var providedByAceEditor = function() {/* noop() */};
var metaKey = isMac ? 'Meta' : 'Control';
var shortcuts = [
  [[metaKey, 'S'], executeTestCode, 'Save+Run'],
  [[metaKey, 'D'], providedByAceEditor(), 'Delete line'],
  [[metaKey, 'Shift', 'D'], providedByAceEditor(), 'Duplicate line']
];

var manager = new ShortcutManager();
manager.registerShortcuts(shortcuts);

var shortcutsAndHints = shortcuts.map(function(shortcut) {
  return {keys: shortcut[0], helpText: shortcut[2]};
});
var overlay = new ShortcutOverlay($('keyboard-shortcut-overlay'));
overlay.render(shortcutsAndHints);

manager.onPossibleShortcut(overlay.show.bind(overlay));
manager.onShortcutEnd(overlay.hide.bind(overlay));
