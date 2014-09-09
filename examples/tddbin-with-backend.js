var exampleTests = require('./example-tests');
var EditorAndRunner = require('../src/editor-and-runner/controller');
var NavigationBar = require('../src/navigation-bar/controller');
var ShortcutManager = require('../src/keyboard-shortcut/shortcut-manager');
var ShortcutOverlay = require('../src/keyboard-shortcut-overlay/overlay');
var reqwest = require('reqwest');

var $ = document.getElementById.bind(document);
var editorAndRunner;

var executeTestCode = function() {
  editorAndRunner.runEditorContent();
  onStartUp()
};

new NavigationBar($('navigation-bar'), executeTestCode);

editorAndRunner = new EditorAndRunner($('editor-and-runner'), '../src/test-runner/mocha/spec-runner.html');
editorAndRunner.setEditorContent(exampleTests.simplePassingTestCode);


// shortcut stuff

var isMac = navigator.platform.indexOf('Mac') === 0;
var providedByAceEditor = function() {/* noop() */};
var metaKey = isMac ? 'Meta' : 'Control';
var shortcuts = [
  [[metaKey, 'S'], executeTestCode, 'Save+Run'],
  [[metaKey, 'D'], providedByAceEditor(), 'Delete line'],
  [[metaKey, 'Shift', 'D'], providedByAceEditor(), 'Duplicate line']
];

var manager = new ShortcutManager();
manager.registerShortcuts(shortcuts);

var shortcutsAndHints = shortcuts.map(function(shortcut) {
  return {keys: shortcut[0], helpText: shortcut[2]};
});
var overlay = new ShortcutOverlay($('keyboard-shortcut-overlay'));
overlay.render(shortcutsAndHints);

manager.onPossibleShortcut(overlay.show.bind(overlay));
manager.onShortcutEnd(overlay.hide.bind(overlay));

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
