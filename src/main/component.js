/** @jsx React.DOM */
var NavigationBar = require('../navigation-bar/component');
var EditorAndRunner = require('../editor-and-runner/component');
var KeyboardShortcutOverlay = require('../keyboard-shortcut-overlay/component');

var React = require('react');

var View = React.createClass({

  render: function() {
    var props = this.props;
    return (
      <div>
        <NavigationBar metaKeySymbol={props.metaKeySymbol} onSave={props.onSave}/>
        <EditorAndRunner editorId={props.editorId} runnerId={props.runnerId}/>
        <KeyboardShortcutOverlay shortcuts={props.shortcuts} isVisible={props.shortcutOverlay.isVisible}/>
      </div>
    );
  }

});

module.exports = View;
