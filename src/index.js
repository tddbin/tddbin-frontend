/* global process */
import MainController from './main-controller';
import {getShortcutObject, metaKey} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';
import StartUp from './startup';
import {xhrGet} from './_external-deps/xhr.js';
import KataUrl from './kata-url.js';
import 'babel-polyfill';

const onSave = () => main.onSave();

const shortcuts = aceDefaultShortcuts.concat([
  getShortcutObject([metaKey, 'S'], onSave, 'Save+Run')
]);

const appDomNode = document.getElementById('tddbin');
var main = new MainController(appDomNode, {
  iframeSrcUrl: './mocha/spec-runner.html',
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

const queryString = window.location.hash.replace(/^#\?/, '');
var kataUrl = KataUrl.fromQueryString(queryString);

startUp.loadSourceCode(kataUrl.toString(), withSourceCode);
function onSuccess(es6KataData) {
  main.showEs6KatasNavigation(es6KataData);
}
if (kataUrl.isEs6Kata) {
  xhrGet(`http://${process.env.KATAS_SERVICE_DOMAIN}/katas/es6/language/__all__.json`, function() {}, onSuccess);
}
