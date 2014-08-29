var React = require('react');
var ViewComponent = require('./component');

function Controller(domNode) {
  this._domNode = domNode;
  this._render();
}

Controller.prototype = {

  _component: null,
  _runner: null,

  _render: function() {
    var props = {
      metaKeySymbol: '⌘',
    };
    this._component = React.renderComponent(ViewComponent(props), this._domNode);
  }

};

module.exports = Controller;
