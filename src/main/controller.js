var React = require('react');
var ViewComponent = require('./component');
var Editor = require('../editor/editor');
var MochaRunner = require('../test-runner/mocha/runner');

var ShortcutManager = require('../keyboard-shortcut/shortcut-manager');

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
      onSave: this._runEditorContent.bind(this),
      shortcuts: this._getShortcutsForComponent(this._config.shortcuts)
    };
    this._component = React.renderComponent(ViewComponent(props), this._domNode);
    this._editor = new Editor(editorDomNodeId);
    this._runner = new MochaRunner(document.getElementById(runnerDomNodeId));
    this._runner.render(this._config.iframeSrcUrl);
    this._setEditorContent(this._config.initialContent);
    this._registerShortcuts(this._config.shortcuts);
  },

  _setEditorContent: function(sourceCode) {
    this._editor.setContent(sourceCode);
  },

  _runEditorContent: function() {
    this._runner.send(this._editor.getContent());
  },

  _getShortcutsForComponent: function(shortcuts) {
    return shortcuts.map(function(shortcut) {
      return {keys: shortcut[0], helpText: shortcut[2]};
    });
  },

  _registerShortcuts: function(shortcuts) {
    var manager = new ShortcutManager();
    manager.registerShortcuts(shortcuts);
//
//    manager.onPossibleShortcut(overlay.show.bind(overlay));
//    manager.onShortcutEnd(overlay.hide.bind(overlay));
  }

};

module.exports = Controller;
