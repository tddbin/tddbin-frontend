/** @jsx React.DOM */

var React = require('react');

var View = React.createClass({

  render: function() {
    return (
      <header className="navigation-bar">
        <button className="logo"></button>
        <button className="icon new" title="Start new TDD session" onClick={this.props.onNew}>New</button>
        <button className="icon save" title="Save and Run tests (⌘S)" onClick={this.props.onSave}>Save and Run ({this.props.metaKeySymbol}S)</button>
        <div className="account">
          {this.props.username}
          <button className="button">Signout</button>
        </div>
      </header>
    );
  }

});

module.exports = View;
