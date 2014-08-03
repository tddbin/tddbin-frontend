/** @jsx React.DOM */

define(['react'], function(React) {
  var Mocha = React.createClass({

    render: function() {
      return (
        <iframe id="embeddedJasmine" src="../src/embedded-mocha/specRunner.html" width="400" height="400"></iframe>
      );
    }

  });

  return Mocha;
});
