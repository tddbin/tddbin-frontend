var expect = require('referee/lib/expect');
var should = require('should');
var assert = require('assert');
require('babel/register');

function consumeMessage(messageData) {
  var sender = messageData.source;
  var specCode = messageData.data;

  // Reset mocha env
  document.getElementById('mocha').innerHTML = '';
  var mocha = new Mocha({reporter: 'html', ui: 'bdd'});
  mocha.suite.emit('pre-require', this, null, this);

  // Run the spec source code, this calls describe, it, etc. and "fills"
  // the test runner suites which are executed later in `mocha.run()`.
  eval(specCode);

  // Let mocha run and report the stats back to the actual sender.
  mocha.checkLeaks();
  var runner = mocha.run(function() {}); // if there is no callback given mocha will fail and not work again :(
  function onRan() {
    var stats = runner.stats;
    sender.postMessage(stats, '*');
  }
  runner.on('end', onRan);
}

window.addEventListener('message', consumeMessage, false);
