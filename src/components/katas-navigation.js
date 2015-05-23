import React from 'react';

export default class KatasNavigation extends React.Component {

  onMouseOver(evt) {
    console.log(evt);
  }

  render() {
    return (
      <div id="katas-navigation">
        <span>ES6 Katas</span>
        <div className="scrollable" onMouseOver={this.onMouseOver.bind(this)}>
          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(id => <a href="/#?kata=some/kata" title={`Kata ${id}`}>#{id}</a>)}
        </div>
      </div>
    );
  }

}
