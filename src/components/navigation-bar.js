import React from 'react';

export default class NavigationBar extends React.Component {

  render() {
    const {onSave, metaKeySymbol, onResetCode} = this.props;
    return (
      <header className="navigation-bar">
        <button className="logo"></button>
        <button className="icon save" title="Run tests (⌘S)" onClick={onSave}>Run tests ({metaKeySymbol}S)</button>
        <button title="Reset code" onClick={onResetCode}>Reset code</button>

        <a href="http://uxebu.com" className="icon uxebu" title="Made by uxebu."></a>
        <a href="http://twitter.com/tddbin" className="icon twitter" title="Get in touch."></a>
        <a href="http://github.com/tddbin/tddbin-frontend" className="icon github" title="Get (into) the code and contribute."></a>
        <a href="https://trello.com/b/FW1gUVxe/tddbin-com" className="icon trello" title="Vote, add features, discuss, ..."></a>
      </header>
    );
  }

}
