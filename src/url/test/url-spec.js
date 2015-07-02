import assert from 'assert';
import sinon from 'sinon';
assert.called = sinon.assert.called;
assert.calledWith = sinon.assert.calledWith;

import Url from '../url.js';

describe('url', function() {
  describe('calls the native history function', function() {
    it('for `copyHashIntoQuery`', function() {
      let updateUrl = sinon.spy();
      let url = Url.inject(updateUrl);
      url.initializeFromLocation({hash: '#?x=1'});

      url.copyHashIntoQuery();

      assert.calledWith(updateUrl, '?x=1');
    });
    it('for `setValueInQuery`', function() {
      let updateUrl = sinon.spy();
      let url = Url.inject(updateUrl);
      url.initializeFromLocation({search: '?x=1'});

      url.setValueInQuery('y', 2);

      assert.calledWith(updateUrl, '?x=1&y=2');
    });
  });

  it('`copyHashIntoQuery` must clone the data, not use a ref', function() {
    let url = Url.inject(function() {});
    url.initializeFromLocation({hash: '#?x=1'});

    url.copyHashIntoQuery();
    url.initializeHash('');

    assertMapsEqual(url.query, new Map([['x', 1]]));
  });
});

function assertMapsEqual(map1, map2) {
  assert.deepEqual(Array.from(map1.entries()), Array.from(map2.entries()));
}
