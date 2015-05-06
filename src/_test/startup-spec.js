/* global global */

global.window = {
  location: {hash: ''}
};
global.localStorage = {
  getItem: function() {}
};

import assert from '../_test-helper/assert';
import StartUp from '../startup.js';

const noop = function() {};

const loadSourceCode = (kataUrl, withSourceCode, xhrGet) => {
  const obj = new StartUp(xhrGet, noop);
  obj.loadSourceCode(kataUrl, withSourceCode);
};

describe('start up', function() {

  it('remove kata from the hash', () => {
    global.window.location.hash = '#?kata=somekata';

    loadSourceCode('somekata', noop, (_, _1, onSuccess) => onSuccess(''));

    assert.equal(global.window.location.hash, '#?');
  });

  describe('get source code from localstorage', function() {

    let withSourceCode;
    beforeEach(function() {
      global.localStorage = {getItem: () => 'kata code'};
      withSourceCode = this.sinon.spy();
    });

    it('if kata param is given but empty', function() {
      const kataUrl = '';
      loadSourceCode(kataUrl, withSourceCode, noop);

      assert.calledWith(withSourceCode, 'kata code');
    });

    it('if there is no kata in the URL', function() {
      const kataUrl = '';
      loadSourceCode(kataUrl, withSourceCode, noop);

      assert.calledWith(withSourceCode, 'kata code');
    });
  });

  describe('get default kata', function() {

    it('if there is no kata in the URL and nothing in localStorage', function() {
      global.localStorage = {getItem: noop};
      const xhrGetDefaultKata = this.sinon.spy();

      const obj = new StartUp(noop, xhrGetDefaultKata);
      obj.loadSourceCode();

      assert.called(xhrGetDefaultKata);
    });

  });

  describe('request fails', function() {
    it('loads source code with error message', function() {
      const withSourceCode = this.sinon.spy();
      const status = 404;
      var kataUrl = 'some';
      loadSourceCode(kataUrl, withSourceCode, (_, onError) => onError(null, {status: status}));

      const errorString =
        `// Kata at "${kataUrl}" not found (status ${status})\n// Maybe try a different kata (see URL).`;
      assert.calledWith(withSourceCode, errorString);
    });
  });

});
