var $ = document.getElementById.bind(document);
var exampleTests = require('./example-tests');
var Main = require('../src/main/main-controller');
var Shortcut = require('../src/keyboard-shortcut/shortcut');
var util = require('../src/keyboard-shortcut/util');

var providedByAceEditor = function() {/* noop() */};
var isMac = navigator.platform.indexOf('Mac') === 0;
var metaKey = isMac ? 'Meta' : 'Control';

var map = {
  Meta: '⌘',
  Shift: '⇧Shift'
};
function format(keys) {
  return util.toPrintableKeys(keys, map);
}

function getShortcutObject(keys, fn, helpText) {
  var shortcut = new Shortcut(keys, fn, helpText);
  shortcut.setPrintableKeysFormatter(format);
  return shortcut;
}

var shortcuts = [
  getShortcutObject([metaKey, 'S'], executeTestCode, 'Save+Run'),
  getShortcutObject([metaKey, 'D'], providedByAceEditor, 'Delete line'),
  getShortcutObject([metaKey, 'Z'], providedByAceEditor, 'Undo'),
  getShortcutObject([metaKey, 'Shift', 'D'], providedByAceEditor, 'Duplicate line'),
  getShortcutObject([metaKey, 'Shift', 'Z'], providedByAceEditor, 'Redo'),
  getShortcutObject([metaKey, '/'], providedByAceEditor, 'Comment in/out line'),

  getShortcutObject([metaKey, 'I', 'E'], providedByAceEditor, '???'),
  getShortcutObject([metaKey, 'I', 'I'], providedByAceEditor, '???'),
  getShortcutObject([metaKey, 'I', 'E', 'E'], providedByAceEditor, '???'),

  getShortcutObject(['Shift', 'F6'], refactoringRename, 'Rename (refactoring)')
];

var main = new Main($('tddbin'), {
  initialContent: exampleTests.simplePassingTestCode,
  iframeSrcUrl: '../src/test-runner/mocha/spec-runner.html',
  shortcuts: shortcuts
});

function executeTestCode() {
  main.runEditorContent();
}
function refactoringRename() {
  main.turnOnRenameMode();
}
