/* global Mocha require */
/* eslint-disable no-unused-vars */
let expect = require('referee').expect; // use require, so babel won't change names!
let assert = require('assert'); // use require, so babel won't change names!
import should from 'should';
/* eslint-enable no-unused-vars */

import {transform} from 'babel-core'; // the es6 transpiler
import 'babel-polyfill';
import RuntimeError from '../runtime-error';

function es6ToEs5Code(sourceCode) {
  try {
    return transform(sourceCode, {optional: ['es6.spec.symbols']}).code;
  } catch (e) {
    const hint = `Syntax or ES6 (babeljs) transpile error
(This transpile error doesn't mean that the web app is broken :))

    `;
    document.getElementById('errorOutput').innerHTML = hint + e;
  }
  return null;
}

function resetMochaEnvironment() {
  document.getElementById('mocha').innerHTML = '';
  let mocha = new Mocha({reporter: 'html', ui: 'bdd'});
  mocha.suite.emit('pre-require', this, null, mocha);
  return mocha;
}
function consumeMessage(messageData) {
  if (messageData.source === messageData.target) {
    // ignore messages sent to itself
    return;
  }
  const sender = messageData.source;
  const specCode = messageData.data;

  const mocha = resetMochaEnvironment.call(this);

  runSpecs(specCode);
  runMochaAndReportStats(mocha, sender);
}

function runSpecs(specCode) {
  // This calls describe, it, etc. and "fills"
  // the test runner suites which are executed later in `mocha.run()`.
  document.getElementById('errorOutput').innerHTML = '';
  var es5Code = es6ToEs5Code(specCode);
  if (es5Code) {
    try {
      eval(es5Code); // eslint-disable-line no-eval
    } catch (e) {
      const errorMessage = 'Runtime error\n\n' + e + '\n\n' + RuntimeError.prettyPrint(e.stack, es5Code);
      document.getElementById('errorOutput').innerHTML = errorMessage;
    }
  }
}

function runMochaAndReportStats(mocha, sender) {
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
