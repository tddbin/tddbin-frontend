/* global ace */
export default class Ace {

  setDomNodeId(domNodeId) {
    this._domNodeId = domNodeId;
    this._init();
  }

  _init() {
    ace.require('ace/ext/language_tools');
    const editor = ace.edit(this._domNodeId);
    this._editor = editor;
    editor.getSession().setMode('ace/mode/javascript');
    editor.setOptions({
      enableBasicAutocompletion: true,
    });

    editor.getSession().setTabSize(2);
    document.getElementById(this._domNodeId).style.fontSize = '12px';
    document.getElementById(this._domNodeId).style.backgroundColor = 'white';
  }

  setContent(content) {
    this._editor.selectAll();
    this._editor.insert(content);
  }

  getContent() {
    return this._editor.getValue();
  }

  resize() {
    this._editor.resize();
  }
}
