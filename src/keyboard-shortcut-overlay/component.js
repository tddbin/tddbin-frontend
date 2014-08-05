/** @jsx React.DOM */

define(['react'], function(React) {

  var Overlay = React.createClass({

    render: function() {
      return (
        <div>
          <span class="shortcut">Meta+S</span>Save+Run<br/>
          <br/>
          <div>
            Note: All keyboard shortcuts fire when you release the Meta key.<br/>
            This allows for combinations such as Meta+I+E and Meta+I+E+E, and way more<br/>
            combinations for faster working with your code.
          </div>
        </div>
      );
    }

  });

  return Overlay;

});
