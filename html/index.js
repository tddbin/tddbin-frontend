var $ = document.getElementById.bind(document);
import {simplePassingTestCode} from './example-tests';
import {Controller as Main} from '../src/main/main-controller';
import {util} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';

var shortcuts = aceDefaultShortcuts.concat([
  util.getShortcutObject([util.metaKey, 'S'], executeTestCode, 'Save+Run'),
  util.getShortcutObject(['Shift', 'F6'], refactoringRename, 'Rename (refactoring)')
]);

var testRunner = getTestRunner();

var main = new Main($('tddbin'), {
  initialContent: simplePassingTestCode,
  iframeSrcUrl: `./${testRunner}/spec-runner.html`,
  shortcuts: shortcuts
});

function executeTestCode() {
  main.runEditorContent();
}
function refactoringRename() {
  main.turnOnRenameMode();
}

function getTestRunner() {
  var validTestRunners = ['mocha', 'jasmine'];
  var queryString = window.location.search;
  var testRunner = queryString.match(/test-runner=(\w+)/);
  if (testRunner && testRunner.length === 2 && validTestRunners.indexOf(testRunner[1]) > -1) {
    return testRunner[1];
  }
  return 'mocha';
}
