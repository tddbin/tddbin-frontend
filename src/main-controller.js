import React from 'react';
import Main from './components/main.js';
import TestRunner from './test-runner/runner';
import ShortcutProcessor from './keyboard-shortcut/shortcut-processor';
import Editor from './editor';

export default class MainController {

  constructor(domNode, onSave, onReset) {
    this._domNode = domNode;
    this._onSave = onSave;
    this._onReset = onReset;
  }

  configure(config) {
    this._config = config;
  }

  render() {
    this._editorDomNodeId = 'editorId';
    this._runnerDomNodeId = 'runnerId';
    this._render();
    this._editor = new Editor(this._editorDomNodeId);
    this._runner = new TestRunner(document.getElementById(this._runnerDomNodeId));
    this._runner.render(this._config.iframeSrcUrl);
    this.setEditorContent('');
    this._registerShortcuts(this._config.shortcuts);
  }

  _render(shortcuts=[]) {
    var props = {
      metaKeySymbol: '⌘',
      editorId: this._editorDomNodeId,
      runnerId: this._runnerDomNodeId,
      onSave: this._onSave,
      onResetCode: this._onReset,
      shortcuts: shortcuts,
      es6Katas: this._es6Katas || null
    };
    React.render(<Main {...props}/>, document.querySelector('#tddbin'));
  }

  showEs6KatasNavigation(es6KataData) {
    this._es6Katas = es6KataData;
    this._render();
    this._editor.resize(); // adding the katas navigation changes the space ACE can use, we must inform it to resize :/
  }

  setEditorContent(sourceCode) {
    this._editor.setContent(sourceCode);
  }

  runEditorContent() {
    this._runner.send(this._editor.getContent());
  }

  _registerShortcuts(shortcuts) {
    var processor = new ShortcutProcessor();
    processor.registerShortcuts(shortcuts);
    processor.onKeyDown(this._updateOverlayView.bind(this));
    processor.onShortcutEnd(this._hideOverlayView.bind(this));
  }

  _hideOverlayView() {
    this._render([]);
  }

  _updateOverlayView(pressedKeys) {
    var allShortcuts = this._config.shortcuts;
    var applicableShortcuts = allShortcuts.filter(function(shortcut) {
      return shortcut.isStartOfKeyCombo(pressedKeys);
    });
    this._render(applicableShortcuts);
  }

}
