var React = require('react');
var ViewComponent = require('./main-view');
var editor = require('ace-with-plugins');
var MochaRunner = require('../test-runner/mocha/runner');

var ShortcutProcessor = require('../keyboard-shortcut/shortcut-processor');

export function Controller(domNode, config) {
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
      onSave: this.runEditorContent.bind(this),
      shortcuts: []
    };
    this._component = React.render(ViewComponent(props), this._domNode);
    this._editor = editor(editorDomNodeId);
    this._runner = new MochaRunner(document.getElementById(runnerDomNodeId));
    this._runner.render(this._config.iframeSrcUrl);
    this.setEditorContent(this._config.initialContent);
    this._registerShortcuts(this._config.shortcuts);
  },

  setEditorContent: function(sourceCode) {
    this._editor.setContent(sourceCode);
  },

  runEditorContent: function() {
    this._runner.send(this._editor.getContent());
  },

  turnOnRenameMode: function() {
    this._editor.turnOnRenameMode();
  },

  _registerShortcuts: function(shortcuts) {
    var processor = new ShortcutProcessor();
    processor.registerShortcuts(shortcuts);
    processor.onKeyDown(this._updateOverlayView.bind(this));
    processor.onShortcutEnd(this._hideOverlayView.bind(this));
  },

  _hideOverlayView: function() {
    this._component.setProps({shortcuts: []});
  },

  _updateOverlayView: function(pressedKeys) {
    var allShortcuts = this._config.shortcuts;
    var applicableShortcuts = allShortcuts.filter(function(shortcut) {
      return shortcut.isStartOfKeyCombo(pressedKeys);
    });
    this._component.setProps({shortcuts: applicableShortcuts});
  }

};
