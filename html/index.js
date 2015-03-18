import {Controller as Main} from '../src/main/main-controller';
import {getShortcutObject, metaKey} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';
import {startUp} from '../src/startup/startup';
import atomic from 'atomic';
atomic = atomic(window);

const onSave = () => main.onSave();

const shortcuts = aceDefaultShortcuts.concat([
  getShortcutObject([metaKey, 'S'], onSave, 'Save+Run')
]);

const appDomNode = document.getElementById('tddbin');
var main = new Main(appDomNode, {
  iframeSrcUrl: `./mocha/spec-runner.html`,
  shortcuts: shortcuts
});

function xhrGet(url, onError, onSuccess) {
  atomic.get(url)
    .success(onSuccess)
    .error(onError)
  ;
}

startUp(main, xhrGet);
