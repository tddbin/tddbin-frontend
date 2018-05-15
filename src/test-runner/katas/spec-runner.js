/* global Mocha */
/* eslint-disable no-unused-vars */
//import expect from 'referee/lib/expect';
//import should from 'should';
import assert from 'assert';
/* eslint-enable no-unused-vars */
import {transform} from '@babel/core'; // the es6 transpiler
import 'babel-polyfill';
import RuntimeError from '../runtime-error';

import HTML from './reporter.js';

function es6ToEs5Code(sourceCode) {
  try {
    return transform(sourceCode).code;
  } catch (e) {
    document.getElementById('errorOutput').innerHTML = `Syntax or ES6 (babeljs) transpile error\n\n${e}`;
  }
  return null;
}

function consumeMessage(messageData) {
  const sender = messageData.source;
  const specCode = messageData.data;

  // Reset mocha env
  document.getElementById('mocha').innerHTML = '';
  const mocha = new Mocha({reporter: HTML, ui: 'bdd'});
  mocha.suite.emit('pre-require', this, null, mocha);

  runSpecs(specCode);
  runMochaAndReportStats(mocha, sender);
}

function runSpecs(specCode) {
  // This calls describe, it, etc. and "fills"
  // the test runner suites which are executed later in `mocha.run()`.
  document.getElementById('errorOutput').innerText = '';
  const es5Code = es6ToEs5Code(specCode);
  if (es5Code) {
    try {
      eval(es5Code); // eslint-disable-line no-eval
    } catch (e) {
      const errorMessage = `Runtime error\n\n${e}\n\n${RuntimeError.prettyPrint(e.stack, es5Code)}`;
      document.getElementById('errorOutput').innerText = errorMessage;
    }
  }
}

function runMochaAndReportStats(mocha, sender) {
  // Let mocha run and report the stats back to the actual sender.
  mocha.checkLeaks();
  const runner = mocha.run(() => {}); // if there is no callback given mocha will fail and not work again :(
  function onRan() {
    const stats = runner.stats;
    sender.postMessage(stats, '*');
  }
  runner.on('end', onRan);
}

window.addEventListener('message', consumeMessage, false);
