/** @jsx React.DOM */

var React = require('react');

var View = React.createClass({

  render: function() {
    return (
      <header className="navigation-bar">
        <button className="logo"></button>
        <button className="icon save" title="Save and Run tests (⌘S)" onClick={this.props.onSave}>Save and Run ({this.props.metaKeySymbol}S)</button>
      </header>
    );
  }

});

module.exports = View;
