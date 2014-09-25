var $ = document.getElementById.bind(document);
var exampleTests = require('./example-tests');
var Main = require('../src/main/main-controller');

var providedByAceEditor = function() {/* noop() */};
var isMac = navigator.platform.indexOf('Mac') === 0;
var metaKey = isMac ? 'Meta' : 'Control';
var shortcuts = [
  [[metaKey, 'S'], executeTestCode, 'Save+Run'],
  [[metaKey, 'D'], providedByAceEditor(), 'Delete line'],
  [[metaKey, 'Shift', 'D'], providedByAceEditor(), 'Duplicate line'],
  [[metaKey, '/'], providedByAceEditor(), 'Comment in/out line'],

  [[metaKey, 'I', 'E'], providedByAceEditor(), '???'],
  [[metaKey, 'I', 'I'], providedByAceEditor(), '???'],
  [[metaKey, 'I', 'E', 'E'], providedByAceEditor(), '???'],

  [['Shift', 'F6'], refactoringRename, 'Rename (refactoring)']
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
