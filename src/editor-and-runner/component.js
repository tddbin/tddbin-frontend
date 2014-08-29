/** @jsx React.DOM */

var React = require('react');

var View = React.createClass({

  render: function() {
    return (
      <div className="editor-and-runner">
        <div id={this.props.editorId} className="editor"></div>
        <div id={this.props.runnerId} className="runner"></div>
      </div>
    );
  }

});

module.exports = View;
