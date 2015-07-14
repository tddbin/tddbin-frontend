import React from 'react';

export default class KatasNavigation extends React.Component {

  render() {
    if (!this.props.katas) {
      return null;
    }
    const selectedKataId = null;
    const katas = this.props.katas.items;
    return (
      <div id="katas-navigation" className="flex-columns-full-width">
        <div className="headline">ES6 Katas</div>
        <div className="scrollable">
          {katas.map(kata => <KataLink kata={kata} selected={selectedKataId === kata.id} />)}
        </div>
      </div>
    );
  }

}

class KataLink extends React.Component {

  render() {
    const {kata, selected} = this.props;
    const {id, path, groupName, name} = kata;
    const uniqueString = new Date().getMilliseconds();
    const url = `${window.location.pathname}?${uniqueString}#?kata=es6/language/${path}`;
    const className = selected ? 'selected' : '';
    return (
      <a href={url} title={`${groupName}: ${name}`} className={className}>{id}</a>
    );
  }

}
