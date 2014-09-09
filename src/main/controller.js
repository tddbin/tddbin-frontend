var React = require('react');
var ViewComponent = require('./component');
var Editor = require('../editor/editor');
var MochaRunner = require('../test-runner/mocha/runner');

function Controller(domNode, config) {
  this._domNode = domNode;
  this._config = config;
  this._render();
}

Controller.prototype = {

  _component: null,

  _render: function() {
    var editorDomNodeId = 'editorId';
    var runnerDomNodeId = 'runnerId';
    var props = {
      metaKeySymbol: '⌘',
      editorId: editorDomNodeId,
      runnerId: runnerDomNodeId,
      onSave: this._runEditorContent.bind(this)
    };
    this._component = React.renderComponent(ViewComponent(props), this._domNode);
    this._editor = new Editor(editorDomNodeId);
    this._runner = new MochaRunner(document.getElementById(runnerDomNodeId));
    this._runner.render(this._config.iframeSrcUrl);
    this._setEditorContent(this._config.initialContent);
  },

  _setEditorContent: function(sourceCode) {
    this._editor.setContent(sourceCode);
  },

  _runEditorContent: function() {
    this._runner.send(this._editor.getContent());
  }

};

module.exports = Controller;
