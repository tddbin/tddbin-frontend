var $ = document.getElementById.bind(document);
var exampleTests = require('./example-tests');
var Main = require('../src/main/main-controller');
var Shortcut = require('../src/keyboard-shortcut/shortcut');

var providedByAceEditor = function() {/* noop() */};
var isMac = navigator.platform.indexOf('Mac') === 0;
var metaKey = isMac ? 'Meta' : 'Control';
var shortcuts = [
  new Shortcut([metaKey, 'S'], executeTestCode, 'Save+Run'),
  new Shortcut([metaKey, 'D'], providedByAceEditor, 'Delete line'),
  new Shortcut([metaKey, 'Shift', 'D'], providedByAceEditor, 'Duplicate line'),
  new Shortcut([metaKey, '/'], providedByAceEditor, 'Comment in/out line'),

  new Shortcut([metaKey, 'I', 'E'], providedByAceEditor, '???'),
  new Shortcut([metaKey, 'I', 'I'], providedByAceEditor, '???'),
  new Shortcut([metaKey, 'I', 'E', 'E'], providedByAceEditor, '???'),

  new Shortcut(['Shift', 'F6'], refactoringRename, 'Rename (refactoring)')
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
  main.placeCursorsForRenaming();
}
