var React = require('react');
var ViewComponent = require('./component');

function Controller(domNode, onSave, onNew) {
  this._domNode = domNode;
  this._onSave = onSave;
  this._onNew = onNew;
  this._render();
}

Controller.prototype = {

  _component: null,
  _runner: null,

  _render: function() {
    var props = {
      metaKeySymbol: '⌘',
      onNew: this._onNew,
      onSave: this._onSave
    };
    this._component = React.renderComponent(ViewComponent(props), this._domNode);
  }

};

module.exports = Controller;
