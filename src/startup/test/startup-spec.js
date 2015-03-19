global.window = {
  location: {hash: ''}
};
global.localStorage = {
  getItem: function() {}
};
process.env.KATAS_SERVICE_DOMAIN = 'katas.tddbin.test';

import assert from '../../_test-helper/assert';
import {startUp, DEFAULT_KATA_URL} from '../startup';

const noop = function() {};

describe('start up', function() {

  it('remove kata from the hash', () => {
    global.window.location.hash = '#?kata=somekata';

    startUp(noop, (_, _1, onSuccess) => onSuccess(''));

    assert.equal(global.window.location.hash, '#?');
  });

  describe('get source code from localstorage', function() {

    let withSourceCode;
    beforeEach(function() {
      global.localStorage = {getItem: () => 'kata code'};
      withSourceCode = this.sinon.spy();
    });

    it('if kata param is given but empty', function() {
      global.window.location.hash = '#?kata=';

      startUp(withSourceCode, noop);

      assert.calledWith(withSourceCode, 'kata code');
    });

    it('if there is no kata in the URL', function() {
      global.window.location.hash = '#?';

      startUp(withSourceCode, noop);

      assert.calledWith(withSourceCode, 'kata code');
    });
  });

  describe('get default kata', function() {

    it('if there is no kata in the URL and nothing in localStorage', function() {
      global.window.location.hash = '#?';
      global.localStorage = {getItem: noop};
      const xhrGet = this.sinon.spy();

      startUp(noop, xhrGet);

      assert.calledWith(xhrGet, DEFAULT_KATA_URL);
    });

  });

  describe('get kata from katas.tddbin.com', function() {

    it('request from the right URL', function() {
      global.window.location.hash = '#?kata=my/kata';
      const xhrGet = this.sinon.spy();

      startUp(noop, xhrGet);

      const kataUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/my/kata.js`;
      assert.calledWith(xhrGet, kataUrl);
    });

  });

});
