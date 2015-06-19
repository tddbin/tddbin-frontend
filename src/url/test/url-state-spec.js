import assert from 'assert';
import sinon from 'sinon';
assert.called = sinon.assert.called;
assert.calledWith = sinon.assert.calledWith;

import UrlState from '../url-state.js';
import Url from '../url.js';

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
