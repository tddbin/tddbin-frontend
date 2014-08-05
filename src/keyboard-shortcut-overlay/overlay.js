define([
  'react',
  'jsx!./component'
], function(
  React,
  OverlayComponent
){

  function Overlay(domNode) {
    this._domNode = domNode;
  }

  Overlay.prototype = {

    render: function() {
      React.renderComponent(OverlayComponent(), this._domNode);
    }

  };

  return Overlay;
});
