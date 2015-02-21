/** @jsx React.DOM */

var React = require('react');

var View = React.createClass({

  render: function() {
    return (
      <header className="navigation-bar">
        <button className="logo"></button>
        <button className="icon save" title="Run tests (⌘S)" onClick={this.props.onSave}>Run tests ({this.props.metaKeySymbol}S)</button>
      </header>
    );
  }

});

module.exports = View;
