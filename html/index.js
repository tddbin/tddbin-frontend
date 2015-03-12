var $ = document.getElementById.bind(document);
import {Controller as Main} from '../src/main/main-controller';
import {getShortcutObject, metaKey} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';
import atomic from 'atomic';
atomic = atomic(window);

const queryString = window.location.hash.replace(/^#\?/, '');

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

  var kataUrl = getKataUrl();
  atomic.get(kataUrl)
    .success((data) => main.setEditorContent(data))
    .error((e, xhr) => {
      if (xhr.status === 404) {
        main.setEditorContent(`// 404, Kata at "${kataUrl}" not found\n// Maybe try a different kata (see URL).`);
      } else {
        main.setEditorContent('// not kata found :(');
      }
    });
}

function getTestRunner() {
  var validTestRunners = ['mocha', 'jasmine'];
  var testRunner = queryString.match(/test-runner=(\w+)/);
  if (testRunner && testRunner.length === 2 && validTestRunners.indexOf(testRunner[1]) > -1) {
    return testRunner[1];
  }
  return 'mocha';
}

const getKataUrl = () => {
  var kataName = queryString.match(/kata=([^&]+)/);
  if (kataName && kataName.length === 2) {
    kataName = kataName[1];
  } else {
    kataName = 'es5/mocha+assert/assert-api';
  }
  return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
};

getSourceCode();
