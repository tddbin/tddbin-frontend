import React from 'react';

export default class View extends React.Component {

  render() {
    return (
      <header className="navigation-bar">
        <button className="logo"></button>
        <button className="icon save" title="Run tests (⌘S)" onClick={this.props.onSave}>Run tests ({this.props.metaKeySymbol}S)</button>

        <a href="http://uxebu.com" className="icon uxebu" title="Made by uxebu."></a>
        <a href="http://twitter.com/tddbin" className="icon twitter" title="Get in touch."></a>
        <a href="http://github.com/tddbin/tddbin-frontend" className="icon github" title="Get (into) the code and contribute."></a>
        <a href="https://trello.com/b/FW1gUVxe/tddbin-com" className="icon trello" title="Vote, add features, discuss, ..."></a>
      </header>
    );
  }

}
