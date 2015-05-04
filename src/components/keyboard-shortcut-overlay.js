import React from 'react';

export default class KeyboardShortcutOverlay extends React.Component {

  render() {
    const {shortcuts, metaKeySymbol} = this.props;
    var isVisible = shortcuts.length > 0;
    var styleProps = {display: isVisible ? 'block' : 'none'};
    return (
      <div className="keyboard-shortcut-overlay" style={styleProps}>
        {shortcuts.map(_renderShortcut)}
        <div className="hint">
          Note: All keyboard shortcuts fire <b>when you release the {metaKeySymbol}</b>  key.<br/>
          This allows for combinations such as  {metaKeySymbol}+I+E  and  {metaKeySymbol}+I+E+E , and way more<br/>
          combinations for faster working with your code.
        </div>
      </div>
    );
  }

}

function _renderShortcut(shortcut) {
  return (
    <div>
      <span className="shortcut">{shortcut.printableKeys} </span>
      {shortcut.helpText}
    </div>
  );
}
