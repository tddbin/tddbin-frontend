import React from 'react';

export class Iframe extends React.Component {

  getIframeRef() {
    return this.refs.iframe.getDOMNode();
  }

  render() {
    return (
      <iframe ref="iframe" src={this.props.iframeSrc} width="100%" height="100%"></iframe>
    );
  }

}
