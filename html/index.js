var $ = document.getElementById.bind(document);
import {simplePassingTestCode} from './example-tests';
import {Controller as Main} from '../src/main/main-controller';
import {util} from './_util';
import {shortcuts as aceDefaultShortcuts} from './_aceDefaultShortcuts';

var shortcuts = aceDefaultShortcuts.concat([
  util.getShortcutObject([util.metaKey, 'S'], executeTestCode, 'Save+Run'),
  util.getShortcutObject(['Shift', 'F6'], refactoringRename, 'Rename (refactoring)')
]);

var main = new Main($('tddbin'), {
  initialContent: simplePassingTestCode,
  iframeSrcUrl: './mocha/spec-runner.html',
  shortcuts: shortcuts
});

function executeTestCode() {
  main.runEditorContent();
}
function refactoringRename() {
  main.turnOnRenameMode();
}
