/** @jsx React.DOM */
var NavigationBar = require('../navigation-bar/navigation-bar-view');
var EditorAndRunner = require('../editor-and-runner/editor-and-runner-view');
var KeyboardShortcutOverlay = require('../keyboard-shortcut-overlay/keyboard-shortcut-overlay-view');

var React = require('react');

var View = React.createClass({

  render: function() {
    var props = this.props;
    return (
      <div>
        <NavigationBar
          metaKeySymbol={props.metaKeySymbol}
          onSave={props.onSave}
        />
        <EditorAndRunner
          editorId={props.editorId}
          runnerId={props.runnerId}
        />
        <KeyboardShortcutOverlay
          metaKeySymbol={props.metaKeySymbol}
          shortcuts={props.shortcuts}
        />
      </div>
    );
  }

});

module.exports = View;
