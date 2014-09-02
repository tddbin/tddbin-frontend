var Editor = require('../src/editor/editor');
var ShortcutManager = require('../src/keyboard-shortcut/shortcut-manager');

var editor = new Editor('editorNode');
editor.setContent('var x = 42; y = x * 2; z = x / 2; function foo(){} var i = 0;');


//ToDo
//highlight all occurences
//trigger getContent after new editor input DONE
//determine of word occurence with ace
//absolute position of occurence needed to identify the word
//evtl. column als id verwenden
//replace old with new name



//editor._editor.getSession().on('change', function (e) {
//  console.log('Current Content:', editor.getContent()); //get current content
//  console.log('Row / Column', editor._editor.selection.getSelectionLead());
//  console.log('Cursor Position', editor._editor.getCursorPosition());
//
//  console.log('Currently highlighted', editor._editor.getCopyText());

//});

var newVariableName = 'test';
var editorContent;

setInterval(function () {
  console.log('currently selected word', editor._editor.getCopyText());
  console.log('cursor postiton', editor._editor.getCursorPosition());
  editorContent = editor.getContent();
  console.log('Editor Content', editorContent);

}, 2000)

var code = editor.getContent();
var ctx = new esrefactor.Context(code);


var id = ctx.identify(16);
console.log('id:', id);
var newCode = ctx.rename(id, newVariableName);
console.log('new code', newCode);


//var result = editor._editor.findAll('x',{
//  backwards: true,
//  wrap: false,
//  caseSensitive: true,
//  wholeWord: false,
//  regExp: false
//});
//
//console.log('RESULT:', result);








var manager = new ShortcutManager();

manager.registerShortcut(['Meta', 'S'], function () {
  console.log('save it');
});
