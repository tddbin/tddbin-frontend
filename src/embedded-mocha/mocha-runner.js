define([
  'react',
  'jsx!./iframe'
], function(
  React,
  Iframe
){

  function MochaRunner(domNode) {
    this._domNode = domNode;
  }

  MochaRunner.prototype = {

    render: function() {
      React.renderComponent(Iframe(), this._domNode);
    }

  };

  return MochaRunner;
});
