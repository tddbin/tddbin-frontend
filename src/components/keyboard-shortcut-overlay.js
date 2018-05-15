import React from 'react';
import KeyboardShortcut from './keyboard-shortcut.js';

export default class KeyboardShortcutOverlay extends React.Component {

  render() {
    const {shortcuts, metaKeySymbol} = this.props;
    const isVisible = shortcuts.length > 0;
    const styleProps = {display: isVisible ? 'block' : 'none'};
    return (
      <div className="keyboard-shortcut-overlay" style={styleProps}>
        {shortcuts.map((shortcut, idx) => <KeyboardShortcut shortcut={shortcut} key={idx}/>)}
        <div className="hint">
          Note: All keyboard shortcuts fire <b>when you release the {metaKeySymbol}</b>  key.<br/>
          This allows for combinations such as {metaKeySymbol}+I+E and {metaKeySymbol}+I+E+E , and way more<br/>
          combinations for faster working with your code.
        </div>
      </div>
    );
  }

}
