import React from 'react';
import View from './main-view';
import MochaRunner from '../test-runner/mocha/runner';
import ShortcutProcessor from '../keyboard-shortcut/shortcut-processor';
var editor = require('ace-with-plugins');

export function Controller(domNode, config) {
  this._domNode = domNode;
  this._config = config;
  this.render();
}

Controller.prototype = {

  _component: null,

  render: function() {
    this._editorDomNodeId = 'editorId';
    this._runnerDomNodeId = 'runnerId';
    this._render();
    this._editor = editor(this._editorDomNodeId);
    this._runner = new MochaRunner(document.getElementById(this._runnerDomNodeId));
    this._runner.render(this._config.iframeSrcUrl);
    this._setEditorContent(this._config.initialContent);
    this._registerShortcuts(this._config.shortcuts);
  },

  _render: function(shortcuts=[]) {
    var props = {
      metaKeySymbol: '⌘',
      editorId: this._editorDomNodeId,
      runnerId: this._runnerDomNodeId,
      onSave: this.runEditorContent.bind(this),
      shortcuts: shortcuts
    };
    this._component = React.render(<View {...props}/>, this._domNode);
  },

  _setEditorContent: function(sourceCode) {
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
    //this._component.props = {shortcuts: []};
    //this._component.setProps({shortcuts: []});
    this._render([]);
  },

  _updateOverlayView: function(pressedKeys) {
    var allShortcuts = this._config.shortcuts;
    var applicableShortcuts = allShortcuts.filter(function(shortcut) {
      return shortcut.isStartOfKeyCombo(pressedKeys);
    });
    this._render(applicableShortcuts);
    //this._component.props = {shortcuts: applicableShortcuts};
    //this._component.props.shortcuts = applicableShortcuts;
    //this._component.setProps({shortcuts: applicableShortcuts});
  }

};
