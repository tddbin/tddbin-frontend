import React from 'react';
import NavigationBar from '../components/navigation-bar.js';
import KeyboardShortcutOverlay from '../components/keyboard-shortcut-overlay.js';
import Es6KatasNavigation from '../components/es6-katas-navigation.js';

export default class Main extends React.Component {
  render() {
    const {
      metaKeySymbol, onSave, onResetCode, onTranspileToEs5Changed,
      transpileToEs5,
      editorId, runnerId, shortcuts, es6Katas
    } = this.props;
    return (
      <div>
        <NavigationBar
          metaKeySymbol={metaKeySymbol}
          onSave={onSave}
          onResetCode={onResetCode}
          transpileToEs5={transpileToEs5}
          onTranspileToEs5Changed={onTranspileToEs5Changed}
        />

        <EditorAndRunner editorId={editorId} runnerId={runnerId} />

        <Es6KatasNavigation katas={es6Katas}/>

        <KeyboardShortcutOverlay
          metaKeySymbol={metaKeySymbol}
          shortcuts={shortcuts}
        />
      </div>
    );
  }
}

class EditorAndRunner extends React.Component {
  render() {
    const {editorId, runnerId} = this.props;
    return (
      <div className="flex-columns-full-width editor-and-runner">
        <div id={editorId} className="editor"></div>
        <div id={runnerId} className="flex-rows-full-height runner"></div>
      </div>
    );
  }
}
