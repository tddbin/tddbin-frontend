import React from 'react';
import Iframe from './iframe';

export default class MochaRunner {

  constructor(domNode, eventReceiver) {
    this._onStats = null;
    this._domNode = domNode;
    (eventReceiver || window).addEventListener('message', this.handleDataReceived.bind(this), false);
  }

  render(iframeSrc) {
    var iframe = React.render(<Iframe iframeSrc={iframeSrc}/>, this._domNode);
    this._iframeRef = iframe.getIframeRef();
  }

  send(sourceCode) {
    var iframe = this._iframeRef.contentWindow;
    iframe.postMessage(sourceCode, '*');
  }

  onStats(fn) {
    this._onStats = fn;
  }

  handleDataReceived(data) {
    if (this._onStats) {
      var stats = data.data;
      this._onStats(stats);
    }
  }

}
