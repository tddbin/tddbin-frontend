import assert from 'assert';
import sinon from 'sinon';
import {loadSourceCode} from '../../load-code-at-startup.js';

assert.called = sinon.assert.called;
assert.calledWith = sinon.assert.calledWith;

function loadKata(remoteSourceCode, kataPath) {
  loadSourceCode(remoteSourceCode, {kataPath});
}
function loadFromGist(remoteSourceCode, gistId) {
  loadSourceCode(remoteSourceCode, {gistId});
}
function loadFromLocal(remoteSourceCode, localStoreId) {
  loadSourceCode(remoteSourceCode, {localStoreId});
}

describe('which code shall be loaded at startup (of tddbin)', function() {

  let remoteSourceCode;
  beforeEach(function() {
    remoteSourceCode = {
      loadKata: sinon.stub(),
      loadFromGist: sinon.stub(),
      loadFromLocal: sinon.stub()
    };
  });

  describe('only a kata is given (/?kata=bla)', function() {
    it('loads the code from the kata', function() {
      const kataPath = 'kata/path';
      loadKata(remoteSourceCode, kataPath);
      assert.calledWith(remoteSourceCode.loadKata, kataPath);
    });
  });

  describe('only a gist URL is given (?gist=xyz)', function() {
    it('loads the code from the gist', function() {
      const gistId = 'gist-id';
      loadFromGist(remoteSourceCode, gistId);
      assert.calledWith(remoteSourceCode.loadFromGist, gistId);
    });
  });

  describe('only a local reference is given (?local=abc)', function() {
    describe('the local reference is valid', function() {
      it('loads the code from the local store', function() {
        const localStoreId = 'local-id';
        loadFromLocal(remoteSourceCode, localStoreId);
        assert.calledWith(remoteSourceCode.loadFromLocal, localStoreId);
      });
    });
    describe('the local reference is NOT valid', function() {
      //it('no code is loaded', function() {
      //  const localStoreId = 'invalid-local-id';
      //
      //  loadFromLocal(remoteSourceCode, localStoreId);
      //
      //  assert.equal('???');
      //});
    });
  });

});

const noop = () => {};
describe('load kata', function() {
  it('if given properly', function(done) {
    const kataName = 'es6/language/destructuring/string';
    const onError = noop;
    _loadKata(kataName, onError, (data) => {
      assert.equal(data.startsWith('// 11: destructuring'), true);
      done();
    });
  });
  it('invalid kata name', function(done) {
    const kataName = 'nix';
    const onSuccess = noop;
    const onError = (e) => {
      assert.equal(e.message.includes('404'), true);
      done();
    };
    _loadKata(kataName, onError, onSuccess);
  });
});

import {loadRemoteFile} from '../../_external-deps/http-get.js';
function _loadKata(kataName, onError, onSuccess) {
  const url = `http://katas.tddbin.com/katas/${kataName}.js`;
  loadRemoteFile(url, (error, data) => {
    if (error) {
      onError(error);
    } else {
      onSuccess(data);
    }
  });
}
