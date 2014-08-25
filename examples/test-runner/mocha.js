var MochaRunner = require('../../src/test-runner/mocha/runner');
var MochaControls = require('./mocha-controls');

var domNode = document.getElementById('embeddedMocha');
var runner = new MochaRunner(domNode);
var iframeSrc = '../../src/test-runner/mocha/spec-runner.html';
runner.render(iframeSrc);

var controls = new MochaControls(runner);
controls.connectButtons('passingTestsButton', 'failingTestsButton', 'manyTestsButton');
runner.onStats(function(stats) {
  document.getElementById('stats').innerHTML = JSON.stringify(stats, null, 2);
});
