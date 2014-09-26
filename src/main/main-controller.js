var React = require('react');
var ViewComponent = require('./main-view');
var editor = require('ace-with-plugins');
var MochaRunner = require('../test-runner/mocha/runner');
var overlayViewData = require('../keyboard-shortcut-overlay/view-data');

var ShortcutProcessor = require('../keyboard-shortcut/shortcut-processor');

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
      onSave: this.runEditorContent.bind(this),
      shortcutOverlay: {
        shortcuts: [],
        isVisible: false
      }
    };
    this._component = React.renderComponent(ViewComponent(props), this._domNode);
    this._editor = editor(editorDomNodeId);
    this._runner = new MochaRunner(document.getElementById(runnerDomNodeId));
    this._runner.render(this._config.iframeSrcUrl);
    this._setEditorContent(this._config.initialContent);
    this._registerShortcuts(this._config.shortcuts);
  },

  _setEditorContent: function(sourceCode) {
    this._editor.setContent(sourceCode);
  },

  runEditorContent: function() {
    this._runner.send(this._editor.getContent());
  },

  placeCursorsForRenaming: function() {
    this._editor.placeCursorsForRenaming();
  },

  _registerShortcuts: function(shortcuts) {
    var processor = new ShortcutProcessor();
    processor.registerShortcuts(shortcuts);
    var noKeyPressed = [];
    processor.onShortcutEnd(this._updateOverlayView.bind(this, noKeyPressed));
    processor.onKeyDown(this._updateOverlayView.bind(this));
  },

  _updateOverlayView: function(pressedKeys) {
    var allShortcuts = this._config.shortcuts;
    var applicableShortcuts = [];
    if (pressedKeys.length > 0) {
      applicableShortcuts = allShortcuts.filter(function(shortcut) {
        return shortcut.isStartOfKeyCombo(pressedKeys);
      });
    }
    var props = {
      shortcuts: applicableShortcuts,
      isVisible: applicableShortcuts.length > 0
    };
    this._component.setProps({shortcutOverlay: props});
  }

};

module.exports = Controller;
