import assert from 'assert';
import sinon from 'sinon';
assert.called = sinon.assert.called;
assert.calledWith = sinon.assert.calledWith;

import UrlState from '../url-state.js';
import Url from '../url.js';

describe('application state, which is stored in the URL', function() {

  const kataName = 'some/cool/kata';
  let url;
  let state;

  function init(location) {
    url = Url.initializeFromLocation(location);
    state = UrlState.useUrl(url);
    sinon.spy(url, 'copyHashIntoQuery');
    sinon.spy(url, 'setValueInQuery');
    state.initialize();
  }

  describe('backwards compat, using hash URLs', function() {

    beforeEach(function() {
      init({hash: '#?kata=' + kataName});
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

    beforeEach(function() {
      init({search: '?kata=' + kataName});
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
