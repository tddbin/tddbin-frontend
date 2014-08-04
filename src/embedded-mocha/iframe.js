/** @jsx React.DOM */

define(['react'], function(React) {

  var Iframe = React.createClass({

    getIframeRef: function() {
      return this.refs.iframe.getDOMNode();
    },

    render: function() {
      return (
        <iframe ref="iframe" src={this.props.iframeSrc} width="100%" height="400"></iframe>
      );
    }

  });

  return Iframe;

});
