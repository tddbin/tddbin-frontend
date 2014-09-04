var editor = require('../../vendor/orion/built-editor-5.0.js');

function Editor(domNodeId) {
  this._domNodeId = domNodeId;
  this._init();
}

Editor.prototype = {

  _init: function () {
    document.getElementById(this._domNodeId).style.fontSize = '12px';
    document.getElementById(this._domNodeId).style.backgroundColor = 'white';

    var options = {
      parent: this._domNodeId,
      lang: 'js'
    }

    this._editor = editor.orion.editor.edit(options);
  },

  setContent: function (content) {
    this._editor.setText(content);
  },

  getContent: function () {
    return this._editor.getText();
  }
};

module.exports = Editor;