import React from 'react';
import NavigationBar from '../components/navigation-bar.js';
import KeyboardShortcutOverlay from '../components/keyboard-shortcut-overlay.js';
import KatasNavigation from '../components/katas-navigation.js';

export default class Main extends React.Component {

  render() {
    const {metaKeySymbol, onSave, onResetCode, editorId, runnerId, shortcuts} = this.props;
    return (
      <body>
        <NavigationBar
          metaKeySymbol={metaKeySymbol}
          onSave={onSave}
          onResetCode={onResetCode}
        />

        <div className="flex-columns-full-width editor-and-runner">
          <div id={editorId} className="editor"></div>
          <div id={runnerId} className="flex-rows-full-height runner"></div>
        </div>

        <KatasNavigation />

        <KeyboardShortcutOverlay
          metaKeySymbol={metaKeySymbol}
          shortcuts={shortcuts}
        />
      </body>
    );
  }

}
