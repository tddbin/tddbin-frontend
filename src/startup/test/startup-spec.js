global.navigator = {platform: 'Mac'};
global.window = {
  location: {hash: ''}
};
global.localStorage = {
  getItem: function() {}
};

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


  it('get default kata, if there is no kata in the URL and nothing in localStorage', function() {
    global.window.location.hash = '#?';
    global.localStorage = {getItem: noop};
    const xhrGet = this.sinon.spy();

    startUp(noop, xhrGet);

    assert.calledWith(xhrGet, DEFAULT_KATA_URL);
  });

});
