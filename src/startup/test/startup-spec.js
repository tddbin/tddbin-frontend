global.window = {
  location: {hash: ''}
};
global.localStorage = {
  getItem: function() {}
};
process.env.KATAS_SERVICE_DOMAIN = 'katas.tddbin.test';

import assert from '../../_test-helper/assert';
import StartUp from '../startup';

const noop = function() {};

const loadSourceCode = (withSourceCode, xhrGet) => {
  const obj = new StartUp(xhrGet);
  obj.loadSourceCode(withSourceCode);
};

describe('start up', function() {

  it('remove kata from the hash', () => {
    global.window.location.hash = '#?kata=somekata';

    loadSourceCode(noop, (_, _1, onSuccess) => onSuccess(''));

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

      loadSourceCode(withSourceCode, noop);

      assert.calledWith(withSourceCode, 'kata code');
    });

    it('if there is no kata in the URL', function() {
      global.window.location.hash = '#?';

      loadSourceCode(withSourceCode, noop);

      assert.calledWith(withSourceCode, 'kata code');
    });
  });

  describe('get default kata', function() {

    it('if there is no kata in the URL and nothing in localStorage', function() {
      global.window.location.hash = '#?';
      global.localStorage = {getItem: noop};
      const xhrGetDefaultKata = this.sinon.spy();

      const obj = new StartUp(noop, xhrGetDefaultKata);
      obj.loadSourceCode();

      assert.called(xhrGetDefaultKata);
    });

  });

  describe('request fails', function() {
    it('loads source code with error message', function() {
      global.window.location.hash = '#?kata=some';
      const withSourceCode = this.sinon.spy();
      const status = 404;
      const kataUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/some.js`;
      loadSourceCode(withSourceCode, (_, onError) => onError(null, {status: status}));

      const errorString = `// Kata at "${kataUrl}" not found (status ${status})\n// Maybe try a different kata (see URL).`
      assert.calledWith(withSourceCode, errorString);
    });
  });

});
