define(function () {

  function Editor (domNodeId) {
    this._domNodeId = domNodeId;
    this._init();
  }

  Editor.prototype = {

    _init: function  () {
      var editor = ace.edit(this._domNodeId);
      editor.getSession().setMode('ace/mode/javascript');
      editor.getSession().setTabSize(2);
      document.getElementById(this._domNodeId).style.fontSize='12px';
      document.getElementById(this._domNodeId).style.backgroundColor='white';
      this._editor = editor;
    },

    setContent: function (content) {
      this._editor.selectAll();
      this._editor.insert(content);
    },

    getContent: function () {
      return this._editor.getValue()
    },

    insertAtCursorPosition: function(s) {
      this._editor.insert(s);
    }
  };

  return Editor;
});
