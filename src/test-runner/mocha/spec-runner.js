/* global Mocha require */
/* eslint-disable no-unused-vars */
const expect = require('referee').expect; // use require, so babel won't change names!
const assert = require('assert'); // use require, so babel won't change names!
import should from 'should';
import * as hamjest from 'hamjest';
/* eslint-enable no-unused-vars */

import {transform} from '@babel/core'; // the es6 transpiler
import babelPresetEnv from '@babel/preset-env';
import 'babel-polyfill';
import RuntimeError from '../runtime-error';

const global = () => new Function('return this;')();

const babelOptions = (transpileToEs5) => {
  if (transpileToEs5) {
    return {presets: [babelPresetEnv], babelrc: false};
  }
  return {};
};

const es6ToEs5Code = (state) => {
  try {
    return transform(state.sourceCode, babelOptions(state.transpileToEs5)).code;
  } catch (e) {
    const hint = `Syntax or ES6 (babeljs) transpile error
(This transpile error doesn't mean that the web app is broken :))

    `;
    document.getElementById('errorOutput').innerHTML = hint + e;
  }
  return null;
};

const resetMochaEnvironment = () => {
  document.getElementById('mocha').innerHTML = '';
  const mocha = new Mocha({reporter: 'html', ui: 'bdd'});
  mocha.suite.emit('pre-require', global(), null, mocha);
  return mocha;
};

const state = {
  sourceCode: '',
  transpileToEs5: true,
};
const consumeMessage = (messageData) => {
  if (messageData.source === messageData.target) {
    // ignore messages sent to itself
    return;
  }
  const sender = messageData.source;
  const receivedData = messageData.data;
  if (receivedData.sourceCode) {
    state.sourceCode = receivedData.sourceCode;
  } else if ('transpileToEs5' in receivedData) {
    state.transpileToEs5 = receivedData.transpileToEs5;
  }
  const mocha = resetMochaEnvironment.call(this);
  runSpecs(state);
  runMochaAndReportStats(mocha, sender);
};

const runSpecs = (state) => {
  // This calls describe, it, etc. and "fills"
  // the test runner suites which are executed later in `mocha.run()`.
  document.getElementById('errorOutput').innerHTML = '';
  const es5Code = es6ToEs5Code(state);
  if (es5Code) {
    try {
      eval(es5Code); // eslint-disable-line no-eval
    } catch (e) {
      const errorMessage = `Runtime error\n\n${e}\n\n${RuntimeError.prettyPrint(e.stack, es5Code)}`;
      document.getElementById('errorOutput').innerHTML = errorMessage;
    }
  }
};

const runMochaAndReportStats = (mocha, sender) => {
  // Let mocha run and report the stats back to the actual sender.
  mocha.checkLeaks();
  const runner = mocha.run(() => {}); // if there is no callback given mocha will fail and not work again :(
  function onRan() {
    const stats = runner.stats;
    sender.postMessage(stats, '*');
  }
  runner.on('end', onRan);
};

module.exports = {es6ToEs5Code};

if (global().addEventListener) global().addEventListener('message', consumeMessage, false);
