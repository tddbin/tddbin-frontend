import React from 'react';

export default class KatasNavigation extends React.Component {

  render() {
    return (
      <div id="katas-navigation">
        <a href="/#?kata=some/kata" title="">#1</a>
        <a href="/#?kata=some/kata" title="">#2</a>
      </div>
    );
  }

}
