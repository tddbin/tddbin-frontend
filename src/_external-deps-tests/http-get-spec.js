import assert from 'assert';
import {loadRemoteFile} from '../_external-deps/http-get.js';

describe('loadRemoteFile', function() {

  describe('loading a kata from katas.tddbin.com', function() {
    it('works', function(done) {
      const url = 'http://katas.tddbin.com/katas/es6/language/destructuring/string.js';
      loadRemoteFile(url, (err, data) => {
        assert.equal(err, null);
        assert.equal(data.startsWith('// 11: destructuring'), true);
        done();
      });
    });
    it('returns an error for wrong URL', function(done) {
      const invalidUrl = 'http://katas.tddbin.com/invalid-kata.bla';
      loadRemoteFile(invalidUrl, (err, data) => {
        assert.equal(data, void 0);
        assert.equal(('' + err).includes('404'), true);
        done();
      });
    });
  });

  describe('loading code from gist.github.com', function() {
    it('works', function() {

    });
    it('returns an error for wrong URL', function() {

    });
  });
});
