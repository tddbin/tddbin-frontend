/** @jsx React.DOM */
var NavigationBar = require('../navigation-bar/component');
var EditorAndRunner = require('../editor-and-runner/component');

var React = require('react');

var View = React.createClass({

  render: function() {
    return (
      <div>
        <NavigationBar metaKeySymbol={this.props.metaKeySymbol} onSave={this.props.onSave}/>
        <EditorAndRunner editorId={this.props.editorId} runnerId={this.props.runnerId}/>
      </div>
    );
  }

});

module.exports = View;
