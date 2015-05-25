import React from 'react';

export default class KatasNavigation extends React.Component {

  render() {
    const selectedKataId = 4;
    return (
      <div id="katas-navigation" className="flex-columns-full-width">
        <div className="headline">ES6 Katas</div>
        <div className="scrollable">
          {[1,2,3,4,5,6,7].map(id => <KataLink id={id} selected={selectedKataId==id} />)}
        </div>
      </div>
    );
  }

}

class KataLink extends React.Component {

  render() {
    const {id, selected} = this.props;
    const className = selected ? 'selected' : '';
    return (
      <a href="/#?kata=some/kata" title={`Kata ${id}`} className={className}>{id}</a>
    );
  }

}
