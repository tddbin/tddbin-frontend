var React = require('react');
var Iframe = require('./iframe');

function MochaRunner(domNode, eventReceiver) {
  this._domNode = domNode;
  (eventReceiver || window).addEventListener('message', this.handleDataReceived.bind(this), false);
}

MochaRunner.prototype = {

  render: function(iframeSrc) {
    var iframe = React.render(Iframe({iframeSrc: iframeSrc}), this._domNode);
    this._iframeRef = iframe.getIframeRef();
  },

  send: function(sourceCode) {
    var iframe = this._iframeRef.contentWindow;
    iframe.postMessage(sourceCode, '*');
  },

  _onStats: null,
  onStats: function(fn) {
    this._onStats = fn;
  },

  handleDataReceived: function(data) {
    if (this._onStats) {
      var stats = data.data;
      this._onStats(stats);
    }
  }

};

module.exports = MochaRunner;
