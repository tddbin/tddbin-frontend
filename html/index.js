var $ = document.getElementById.bind(document);
import {simplePassingTestCode} from './example-tests';
import {Controller as Main} from '../src/main/main-controller';
import {getShortcutObject, metaKey} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';
import atomic from 'atomic';
atomic = atomic(window);

const queryString = window.location.search;

const shortcuts = aceDefaultShortcuts.concat([
  getShortcutObject([metaKey, 'S'], onSave, 'Save+Run'),
  getShortcutObject(['Shift', 'F6'], refactoringRename, 'Rename (refactoring)')
]);

var main = new Main($('tddbin'), {
  iframeSrcUrl: `./${getTestRunner()}/spec-runner.html`,
  shortcuts: shortcuts
});

function onSave() {
  main.onSave();
}

function refactoringRename() {
  main.turnOnRenameMode();
}
function getSourceCode() {

  var sourceCode = localStorage.getItem('code');
  if(sourceCode) {
    main.setEditorContent(sourceCode);
    return;
  }

  var kataName = queryString.match(/kata=(\w+)/);
  if (kataName && kataName.length === 2) {
    var kataUrl = `http://katas.tddbin.com/katas/mocha-assert-api.js`;
    document.domain = 'katas.tddbin.com';
    atomic.get(kataUrl)
      .success(function(data) {
        main.setEditorContent(data);
      })
      .error(function() {});
  } else {
    main.setEditorContent(simplePassingTestCode);
  }
}
getSourceCode();


function getTestRunner() {
  var validTestRunners = ['mocha', 'jasmine'];
  var testRunner = queryString.match(/test-runner=(\w+)/);
  if (testRunner && testRunner.length === 2 && validTestRunners.indexOf(testRunner[1]) > -1) {
    return testRunner[1];
  }
  return 'mocha';
}
