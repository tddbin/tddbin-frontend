/** @jsx React.DOM */

var React = require('react');

var Overlay = React.createClass({

  _renderShortcut: function(shortcut) {
    return (
      <div>
        <span className="shortcut">{shortcut.getPrintableKeys()} </span>
        {shortcut.getHelpText()}
      </div>
    );
  },

  _renderShortcuts: function(shortcuts) {
    return shortcuts.map(this._renderShortcut);
  },

  render: function() {
    var props = this.props;
    var shortcuts = props.shortcuts;
    var isVisible = props.shortcuts.length > 0;
    var styleProps = {display: isVisible ? 'block' : 'none'};
    var metaKeySymbol = props.metaKeySymbol;
    return (
      <div className="keyboard-shortcut-overlay" style={styleProps}>
        {this._renderShortcuts(shortcuts)}
        <div className="hint">
          Note: All keyboard shortcuts fire <b>when you release the {metaKeySymbol}</b>  key.<br/>
          This allows for combinations such as  {metaKeySymbol}+I+E  and  {metaKeySymbol}+I+E+E , and way more<br/>
          combinations for faster working with your code.
        </div>
      </div>
    );

//      <span className="shortcut"> meta_key "D" </span>Remove line<br/>
//      <span className="shortcut"> meta_key "I" </span>Insert code<br/>
//      <div className="subShortcut">
//        <span className="shortcut">E</span>expect().toBe();<br/>
//        <span className="shortcut">EE</span>expect().toEqual();<br/>
//        <span className="shortcut">I</span>it();<br/>
//      </div>
//      <span className="shortcut"> meta_key "S" </span><span className="run">Run tests (and save)</span><br/>
//      <span className="shortcut"> meta_key "/" </span>Toggle comment<br/>
//      <br/>
  }

});

module.exports = Overlay;
