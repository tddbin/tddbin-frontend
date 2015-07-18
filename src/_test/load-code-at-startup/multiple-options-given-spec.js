import assert from 'assert';
import sinon from 'sinon';
import {loadSourceCode} from '../../load-code-at-startup.js';

assert.calledWith = sinon.assert.calledWith;
assert.notCalled = sinon.assert.notCalled;

//describe('a kata+gist are given', function() {
//
//  let remoteSourceCode;
//  beforeEach(function() {
//    remoteSourceCode = {
//      loadKata: sinon.stub(),
//      loadFromGist: sinon.stub(),
//      loadFromLocal: sinon.stub()
//    };
//  });
//
//  describe('gist is available', function() {
//    const kataPath = 'kata/path';
//    const gistId = 'gist-id';
//    beforeEach(function() {
//      loadSourceCode(remoteSourceCode, {gistId, kataPath});
//    });
//    it('load the gist', function() {
//      assert.calledWith(remoteSourceCode.loadFromGist, gistId);
//    });
//    it('dont load the kata', function() {
//      assert.notCalled(remoteSourceCode.loadKata);
//    });
//    it('enable `load kata` button', function() {
//
//    });
//  });
//  it('load from the gist', function() {
//
//  });
//  describe('gist is not available', function() {
//    it('load the kata', function() {
//
//    });
//    it('hint to the user, that the gist was not found', function() {
//
//    });
//  });
//});
