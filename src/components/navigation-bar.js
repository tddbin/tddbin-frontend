import React from 'react';

const TWITTER_URL = 'http://twitter.com/tddbin';
const GITHUB_URL = 'http://github.com/tddbin/tddbin-frontend';
const TRELLO_URL = 'https://trello.com/b/FW1gUVxe/tddbin-com';
const UXEBU_URL = 'http://uxebu.com';

export default class NavigationBar extends React.Component {

  render() {
    const {onSave, metaKeySymbol, onResetCode} = this.props;
    return (
      <header className="navigation-bar">
        <button className="logo"></button>
        <span className="tddbin">TDD bin</span>
        <button className="save" title={`Run tests (${metaKeySymbol}S)`} onClick={onSave}>Run tests</button>
        <button title="Reset code" onClick={onResetCode}>Reset code</button>

        <a href={TWITTER_URL} className="icon twitter" title="Get in touch."></a>
        <a href={GITHUB_URL} className="icon github" title="Get (into) the code and contribute."></a>
        <a href={TRELLO_URL} className="icon trello" title="Vote, add features, discuss, ..."></a>
        <a href={UXEBU_URL} className="icon uxebu" title="Made by uxebu."></a>
      </header>
    );
  }

}
