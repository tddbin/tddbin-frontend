import expect from 'referee/lib/expect';
import should from 'should';
import assert from 'assert';
import {transform} from 'babel-core'; // the es6 transpiler
import RuntimeError from '../runtime-error'

function es6ToEs5(sourceCode) {
  return transform(sourceCode).code
}

function consumeMessage(messageData) {
  var sender = messageData.source;
  var specCode = messageData.data;

  // Reset mocha env
  document.getElementById('mocha').innerHTML = '';
  var mocha = new Mocha({reporter: 'html', ui: 'bdd'});
  mocha.suite.emit('pre-require', this, null, this);

  // Run the spec source code, this calls describe, it, etc. and "fills"
  // the test runner suites which are executed later in `mocha.run()`.
  document.getElementById('errorOutput').innerText = '';
  var es5Code;
  try {
    es5Code = es6ToEs5(specCode);
  } catch(e) {
    document.getElementById('errorOutput').innerText = 'Syntax or ES6 transpile error\n\n' + e;
    return;
  }
  try {
    eval(es5Code);
  } catch(e) {
    document.getElementById('errorOutput').innerText = 'Runtime error\n\n' + e + '\n\n' + RuntimeError.prettyPrint(e.stack, es5Code);
    return;
  }

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
