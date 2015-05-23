import React from 'react';
import NavigationBar from '../components/navigation-bar.js';
import KeyboardShortcutOverlay from '../components/keyboard-shortcut-overlay.js';
import KatasNavigation from '../components/katas-navigation.js';

export default class Main extends React.Component {

  render() {
    const {metaKeySymbol, onSave, onResetCode, editorId, runnerId, shortcuts} = this.props;
    return (
      <div>
        <NavigationBar
          metaKeySymbol={metaKeySymbol}
          onSave={onSave}
          onResetCode={onResetCode}
        />

        <div className="editor-and-runner">
          <div id={editorId} className="editor"></div>
          <div className="runner">
            <div id={runnerId}></div>
            <KatasNavigation />
          </div>
        </div>

        <KeyboardShortcutOverlay
          metaKeySymbol={metaKeySymbol}
          shortcuts={shortcuts}
        />
      </div>
    );
  }

}
