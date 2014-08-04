define(function() {

  var testSpecs = {
    simplePassing: "describe('test embedded mocha', function() {\
        it('should run', function() {\
          expect(1)\
            .toBe(1);\
        });\
      });",
    simpleFailing: "describe('test embedded mocha', function() {\
        it('should fail', function() {\
          expect(1)\
            .toBe(2);\
        });\
      });"
  };

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
      this._postTestSourceCode(testSpecs.simplePassing);
    },
    _postFailingTest: function() {
      this._postTestSourceCode(testSpecs.simpleFailing);
    },
    _postManyTests: function() {
      this._postTestSourceCode([
        testSpecs.simplePassing,
        testSpecs.simplePassing,
        testSpecs.simplePassing,
        testSpecs.simpleFailing,
        testSpecs.simpleFailing,
        testSpecs.simplePassing
      ].join('\n'));
    },
    _postTestSourceCode: function(sourceCode) {
      this._mochaRunner.send(sourceCode);
    }
  };

  return Controls;
});
