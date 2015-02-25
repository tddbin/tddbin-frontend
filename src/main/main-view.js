var NavigationBar = require('../navigation-bar/navigation-bar-view');
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

        <div className="editor-and-runner">
          <div id={this.props.editorId} className="editor"></div>
          <div id={this.props.runnerId} className="runner"></div>
        </div>

        <KeyboardShortcutOverlay
          metaKeySymbol={props.metaKeySymbol}
          shortcuts={props.shortcuts}
        />
      </div>
    );
  }

});

module.exports = View;
