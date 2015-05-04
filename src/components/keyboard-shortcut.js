import React from 'react';

export default class KeyboardShortcut extends React.Component {

  render() {
    const {printableKeys, helpText} = this.props.shortcut;
    return (
      <div>
        <span className="shortcut">{printableKeys} </span>
        {helpText}
      </div>
    );
  }

}
