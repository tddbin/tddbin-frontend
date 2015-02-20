var $ = document.getElementById.bind(document);
var exampleTests = require('./example-tests');
var Main = require('../src/main/main-controller');
var util = require('./_util');
var aceDefaultShortcuts = require('./_aceDefaultShortcuts');

var shortcuts = aceDefaultShortcuts.concat([
  util.getShortcutObject([util.metaKey, 'S'], executeTestCode, 'Save+Run'),
  util.getShortcutObject(['Shift', 'F6'], refactoringRename, 'Rename (refactoring)')
]);

var main = new Main($('tddbin'), {
  initialContent: exampleTests.simplePassingTestCode,
  iframeSrcUrl: './mocha/spec-runner.html',
  shortcuts: shortcuts
});

function executeTestCode() {
  main.runEditorContent();
}
function refactoringRename() {
  main.turnOnRenameMode();
}
