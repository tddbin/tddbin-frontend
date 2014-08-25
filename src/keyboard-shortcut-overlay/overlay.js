var React = require('react');
var OverlayComponent = require('./component');

function Overlay(domNode) {
  this._domNode = domNode;
}

Overlay.prototype = {

  _component: null,

  render: function(shortcuts) {
    this._component = React.renderComponent(OverlayComponent({shortcuts: shortcuts}), this._domNode);
  },

  show: function() {
    this._component.show();
  },

  hide: function() {
    this._component.hide();
  }

};

module.exports = Overlay;
