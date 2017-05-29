import React from 'react';

export default class Iframe extends React.Component {

  getIframeRef() {
    return document.getElementById('iframe');
  }

  render() {
    return (
      <iframe id="iframe" src={this.props.iframeSrc} width="100%" height="100%"></iframe>
    );
  }

}
