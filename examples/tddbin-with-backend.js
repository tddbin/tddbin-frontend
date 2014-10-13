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
  iframeSrcUrl: '../src/test-runner/mocha/spec-runner.html',
  shortcuts: shortcuts
});

function executeTestCode() {
  main.runEditorContent();
}
function refactoringRename() {
  main.turnOnRenameMode();
}

var reqwest = require('reqwest');
function onStartUp() {
  console.log('Fire ...');
  reqwest({
    method: 'POST',
    url: '//tddbin.local:8000/sessions/',
    headers: {
      Authorization: 'Token 215744edb33d728845acf5bbce34ba1b26ae89fd'
    },
    data: {name: ''},
    success: function(resp) {
      console.log('SESSION POST:', resp);
    },
    error: function(error) {
      console.log('Error POSTing:', error);
    }
  });
}
onStartUp();
