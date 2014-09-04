var editor = require('../../vendor/orion/built-editor.min.js');

console.log('Editor', editor);

function Editor(domNodeId) {
  this._domNodeId = domNodeId;
  this._init();
}

Editor.prototype = {

  _init: function () {
    document.getElementById(this._domNodeId).style.fontSize = '12px';
    document.getElementById(this._domNodeId).style.backgroundColor = 'white';
    this._editor = editor;
    console.log('_editor', this._editor);
    this._editor.orion.editor.edit({parent: this._domNodeId});

  },

  //set and get replace with orion setter and getter

  setContent: function (content) {
//      this._editor.selectAll();
//      this._editor.insert(content);
//    this._editor.TextView(options)
//    this._editor.setText(content);
  },

  getContent: function () {
//      return this._editor.getValue()
  },

  insertAtCursorPosition: function (s) {
//      this._editor.insert(s);
  }
};

module.exports = Editor;