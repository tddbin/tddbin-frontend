import React from 'react';
import NavigationBar from '../navigation-bar/navigation-bar-view';
import KeyboardShortcutOverlay from '../keyboard-shortcut-overlay/keyboard-shortcut-overlay-view';

export default class View extends React.Component {

  render() {
    var props = this.props;
    return (
      <div>
        <NavigationBar
          metaKeySymbol={props.metaKeySymbol}
          onSave={props.onSave}
          onResetCode={props.onResetCode}
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

}
