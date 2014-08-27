"use strict";

var exampleTests = require('../example-tests');

function Controls(mochaRunner) {
  this._mochaRunner = mochaRunner;
}

Controls.prototype = {
  connectButtons: function(passingButtonId, failingButtonId, manyButtonId) {
    function connect(id, fn) {
      document.getElementById(id).addEventListener('click', fn);
    }
    connect(passingButtonId, this._postPassingTest.bind(this));
    connect(failingButtonId, this._postFailingTest.bind(this));
    connect(manyButtonId, this._postManyTests.bind(this));
  },
  _postPassingTest: function() {
    this._postTestSourceCode(exampleTests.simplePassingTestCode);
  },
  _postFailingTest: function() {
    this._postTestSourceCode(exampleTests.simplePassingTestCode);
  },
  _postManyTests: function() {
    this._postTestSourceCode([
      exampleTests.simplePassingTestCode,
      exampleTests.simplePassingTestCode,
      exampleTests.simplePassingTestCode,
      exampleTests.simpleFailingTestCode,
      exampleTests.simpleFailingTestCode,
      exampleTests.simplePassingTestCode
    ].join('\n'));
  },
  _postTestSourceCode: function(sourceCode) {
    this._mochaRunner.send(sourceCode);
  }
};

module.exports = Controls;
