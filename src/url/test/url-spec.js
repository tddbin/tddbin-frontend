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
});
