var React = require('react');
var ViewComponent = require('./component');
var Editor = require('../editor/editor');
var MochaRunner = require('../test-runner/mocha/runner');

function Controller(domNode, iframeSrcUrl) {
  this._domNode = domNode;
  this._iframeSrcUrl = iframeSrcUrl;
  this._render();
}

Controller.prototype = {

  _component: null,
  _runner: null,

  _render: function() {
    var editorDomNodeId = 'editorId';
    var runnerDomNodeId = 'runnerId';
    this._component = React.renderComponent(ViewComponent({
      editorId: editorDomNodeId, runnerId: runnerDomNodeId
    }), this._domNode);
    this._editor = new Editor(editorDomNodeId);
    this._runner = new MochaRunner(document.getElementById(runnerDomNodeId));
    this._runner.render(this._iframeSrcUrl);
  },

  setEditorContent: function(sourceCode) {
    this._editor.setContent(sourceCode);
  },

  runEditorContent: function() {
    this._runner.send(this._editor.getContent());
  }

};

module.exports = Controller;
