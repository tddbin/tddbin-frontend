import assert from 'assert';
import sinon from 'sinon';
assert.calledWith = sinon.assert.calledWith;

describe('application state, which is stored in the URL', function() {

  describe('backwards compat, using hash URLs', function() {

    const kataName = 'some/cool/kata';
    const hash = '#?kata=' + kataName;
    let url;
    let state;
    beforeEach(function() {
      url = Url.fromLocation({hash});
      state = UrlState.useUrl(url);
      sinon.spy(url, 'setQueryTo');
      state.initialize();
    });

    it('a kata name in a hash, updates the query in the URL', function() {
      assert.calledWith(url.setQueryTo, {kata: 'some/cool/kata'});
    });
    it('mark kata as stored locally updates the query', function() {
      state.markKataAsStoredLocally();
      assert.calledWith(url.setQueryTo, {kata: 'some/cool/kata', storedLocally: 1});
    });
    it('provide the proper kata name', function() {
      assert.equal(state.kataName, kataName);
    });
    describe('property `isKataStoredLocally`', function() {
      it('is false right at start', function() {
        assert.equal(state.isKataStoredLocally, false);
      });
      it('is true after marked so', function() {
        state.markKataAsStoredLocally();
        assert.equal(state.isKataStoredLocally, true);
      });
    });
  });
  describe('stored in the URL query', function() {
    it('', function() {

    });
  });
});

class Url {
  static fromLocation(location) {
    const url = new Url();
    let hash = location.hash;
    if (hash.startsWith('#?')) {
      hash = hash.substr(2);
    }
    url.hash = querystring.parse(hash);
    return url;
  }
  setQueryTo() {

  }
}

import querystring from 'querystring';
class UrlState {

  static useUrl(url) {
    var urlState = new UrlState();
    urlState.url = url;
    return urlState;
  }
  initialize() {
    this.url.setQueryTo(this.url.hash);
  }

  markKataAsStoredLocally() {
    const hash = this.url.hash;
    hash.storedLocally = 1;
    this.url.setQueryTo(hash);
  }

  get kataName() {
    return this.url.hash.kata;
  }

  get isKataStoredLocally() {
    return !!this.url.hash.storedLocally;
  }



  //static fromUrl(queryString, hashString) {
  //  let urlInstance = new UrlState();
  //  urlInstance.mayConvertHashUrl(hashString);
  //  urlInstance.query = querystring.parse(queryString.replace(/^\?/, ''));
  //  return urlInstance;
  //}
  //
  //mayConvertHashUrl(hashString) {
  //  const queryStringInHash = hashString.replace(/^#\?/, '');
  //  if (queryStringInHash) {
  //    this.setQueryInUrl(queryStringInHash);
  //  }
  //}

  //setQueryInUrl(queryString) {
  //  window.history.pushState(null, {}, `?${queryString}`);
  //}
  //


}
//let urlState = UrlState.fromUrl(window.location.search, window.location.hash);
