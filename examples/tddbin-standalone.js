var $ = document.getElementById.bind(document);
var exampleTests = require('./example-tests');
var Main = require('../src/main/controller');

var providedByAceEditor = function() {/* noop() */};
var isMac = navigator.platform.indexOf('Mac') === 0;
var metaKey = isMac ? 'Meta' : 'Control';
var shortcuts = [
  [[metaKey, 'S'], executeTestCode, 'Save+Run'],
  [[metaKey, 'D'], providedByAceEditor(), 'Delete line'],
  [[metaKey, 'Shift', 'D'], providedByAceEditor(), 'Duplicate line']
];

var main = new Main($('tddbin'), {
  initialContent: exampleTests.simplePassingTestCode,
  iframeSrcUrl: '../src/test-runner/mocha/spec-runner.html',
  shortcuts: shortcuts
});

function executeTestCode() {
  main.runEditorContent();
}
