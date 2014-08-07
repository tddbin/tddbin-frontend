/** @jsx React.DOM */

define(['react'], function(React) {

  var Overlay = React.createClass({

    show: function() {
      this.getDOMNode().style.display = 'block';
    },

    hide: function() {
      this.getDOMNode().style.display = 'none';
    },

    _renderShortcut: function(shortcut) {
      return (
        <div>
          <span className="shortcut"> meta_key "{shortcut.keys.join('+')}" </span>
          {shortcut.helpText}
        </div>
      );
    },

    _renderShortcuts: function(shortcuts) {
      return shortcuts.map(this._renderShortcut);
    },

    render: function() {
      var shortcuts = this.props.shortcuts;
      return (
        <div className="keyboard-shortcut-overlay">
          {this._renderShortcuts(shortcuts)}
          <div className="hint">
            Note: All keyboard shortcuts fire <b>when you release the  meta_key ""</b>  key.<br/>
            This allows for combinations such as  meta_key "IE"  and  meta_key "IEE" , and way more<br/>
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

  return Overlay;

});
