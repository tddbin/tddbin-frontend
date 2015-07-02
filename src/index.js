/* global process */
import MainController from './main-controller';
import {createShortcutObject, metaKey} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';
import StartUp from './startup';
import {xhrGet} from './_external-deps/xhr.js';
import KataUrl from './kata-url.js';
import UrlState from './url/url-state.js';
import Url from './url/url.js';
import {updateUrl} from './_external-deps/url.js';

const url = Url.inject(updateUrl);
url.initializeFromLocation(window.location);
let urlState = UrlState.useUrl(url);
urlState.initialize();


function onSave() {
  urlState.markKataAsStoredLocally();
  window.localStorage.setItem('code', main._editor.getContent());
  main.runEditorContent();
}

function onReset() {
  window.localStorage.removeItem('code');
  window.location.reload();
}

const shortcuts = [
  ...aceDefaultShortcuts,
  createShortcutObject([metaKey, 'S'], onSave, 'Save+Run')
];

const appDomNode = document.getElementById('tddbin');
var main = new MainController(appDomNode, onSave, onReset);
main.configure({
  iframeSrcUrl: `./mocha/spec-runner.html`,
  shortcuts: shortcuts
});
main.render();

const withSourceCode = (sourceCode) => {
  main.setEditorContent(sourceCode);
  setTimeout(onSave, 1000);
};

const kataName = 'es5/mocha+assert/assert-api';
export const DEFAULT_KATA_URL = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
var xhrGetDefaultKata = xhrGet.bind(null, DEFAULT_KATA_URL);

const startUp = new StartUp(xhrGet, xhrGetDefaultKata);

var kataUrl = KataUrl.fromKataName(urlState.kataName);

startUp.loadSourceCode(urlState.isKataStoredLocally, kataUrl.toString(), withSourceCode);
function onSuccess(es6KataData) {
  main.showEs6KatasNavigation(es6KataData);
}
if (kataUrl.isEs6Kata) {
  xhrGet(`http://${process.env.KATAS_SERVICE_DOMAIN}/katas/es6/language/__all__.json`, function() {}, onSuccess);
}
