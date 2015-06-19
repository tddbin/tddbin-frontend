import assert from 'assert';
import sinon from 'sinon';
assert.called = sinon.assert.called;
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
      sinon.spy(url, 'copyHashIntoQuery');
      sinon.spy(url, 'setValueInQuery');
      state.initialize();
    });

    it('a kata name in a hash, updates the query in the URL', function() {
      assert.called(url.copyHashIntoQuery);
    });
    it('marking a kata as stored locally updates the query', function() {
      state.markKataAsStoredLocally();
      assert.calledWith(url.setValueInQuery, 'storedLocally', 1);
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

    const kataName = 'some/cool/kata';
    const queryString = '?kata=' + kataName;
    let url;
    let state;
    beforeEach(function() {
      url = Url.fromLocation({search: queryString});
      state = UrlState.useUrl(url);
      sinon.spy(url, 'setValueInQuery');
      state.initialize();
    });

    it('marking a kata as stored locally updates the query', function() {
      state.markKataAsStoredLocally();
      assert.calledWith(url.setValueInQuery, 'storedLocally', 1);
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
});

function objectToMap(obj) {
  let map = new Map();
  for (let key of Object.keys(obj)) {
    map.set(key, obj[key]);
  }
  return map;
}

class Url {
  static fromLocation(location) {
    const url = new Url();
    url.initalizeHash(location.hash);
    url.initalizeQuery(location.search);
    return url;
  }
  initalizeHash(hash='') {
    if (hash.startsWith('#?')) {
      hash = hash.substr(2);
    }
    this.hash = objectToMap(querystring.parse(hash));
  }
  initalizeQuery(query='') {
    if (query.startsWith('?')) {
      query = query.substr(1);
    }
    this.query = objectToMap(querystring.parse(query));
  }
  copyHashIntoQuery() {
    this.query = this.hash;
  }
  setValueInQuery(key, value) {
    this.query.set(key, value);
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
    if (this.url.hash.size > 0) {
      this.url.copyHashIntoQuery();
    }
  }

  markKataAsStoredLocally() {
    this.url.setValueInQuery('storedLocally', 1);
  }

  get kataName() {
    return this.url.query.get('kata');
  }

  get isKataStoredLocally() {
    return !!this.url.query.get('storedLocally');
  }

}
//let urlState = UrlState.fromUrl(window.location.search, window.location.hash);
