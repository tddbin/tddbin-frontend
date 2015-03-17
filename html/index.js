import {Controller as Main} from '../src/main/main-controller';
import {getShortcutObject, metaKey} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';
import atomic from 'atomic';
atomic = atomic(window);

const queryString = window.location.hash.replace(/^#\?/, '');

const getTestRunner = () => {
  var validTestRunners = ['mocha', 'jasmine'];
  var testRunner = queryString.match(/test-runner=(\w+)/);
  if (testRunner && testRunner.length === 2 && validTestRunners.indexOf(testRunner[1]) > -1) {
    return testRunner[1];
  }
  return 'mocha';
};

const getSourceCode = () => {
  var kataUrl = getKataUrl();
  var sourceCode = localStorage.getItem('code');
  if (kataUrl) {
    loadKataFromUrl(kataUrl, withKataSourceCode);
  } else if (sourceCode) {
    withKataSourceCode(sourceCode);
  } else {
    loadDefaultKata(withKataSourceCode);
  }
  window.location.hash = window.location.hash.replace(/kata=([^&]+)/, '');
};

const withKataSourceCode = (sourceCode) => {
  main.setEditorContent(sourceCode);
  setTimeout(onSave, 1000);
};

const loadDefaultKata = (onLoaded) => {
  const kataName = 'es5/mocha+assert/assert-api';
  const kataUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
  loadKataFromUrl(kataUrl, onLoaded);
};

const loadKataFromUrl = (kataUrl, onLoaded) => {
  atomic.get(kataUrl)
    .success((data) => onLoaded(data))
    .error((e, xhr) => {
      if (xhr.status === 404) {
        onLoaded(`// 404, Kata at "${kataUrl}" not found\n// Maybe try a different kata (see URL).`);
      } else {
        onLoaded('// not kata found :(');
      }
    });
};

const getKataUrl = () => {
  var kataName = queryString.match(/kata=([^&]+)/);
  if (kataName && kataName.length === 2) {
    kataName = kataName[1];
    return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
  }
};


const onSave = () => main.onSave();

const shortcuts = aceDefaultShortcuts.concat([
  getShortcutObject([metaKey, 'S'], onSave, 'Save+Run')
]);

const appDomNode = document.getElementById('tddbin');
var main = new Main(appDomNode, {
  iframeSrcUrl: `./${getTestRunner()}/spec-runner.html`,
  shortcuts: shortcuts
});

getSourceCode();
