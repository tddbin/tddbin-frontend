/* global process */
import MainController from './main-controller';
import {createShortcutObject, metaKey} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';
import StartUp from './startup';
import {xhrGet} from './_external-deps/xhr.js';
import KataUrl from './kata-url.js';
import querystring from 'querystring';

// get all globals

function setInUrlQuery(key, value) {
  const query = querystring.parse(window.location.search.replace(/^\?/, ''));
  query[key] = value;
  window.history.pushState(null, {}, `?${querystring.stringify(query)}`);
}

function onSave() {
  setInUrlQuery('storedLocally', 1);
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

const queryStringInHash = window.location.hash.replace(/^#\?/, '');
if (queryStringInHash) {
  window.history.pushState(null, {}, `?${queryStringInHash}`);
}
const query = querystring.parse(window.location.search.replace(/^\?/, ''));
var kataUrl = KataUrl.fromKataName(query.kata);

startUp.loadSourceCode(query.storedLocally, kataUrl.toString(), withSourceCode);
function onSuccess(es6KataData) {
  main.showEs6KatasNavigation(es6KataData);
}
if (kataUrl.isEs6Kata) {
  xhrGet(`http://${process.env.KATAS_SERVICE_DOMAIN}/katas/es6/language/__all__.json`, function() {}, onSuccess);
}
