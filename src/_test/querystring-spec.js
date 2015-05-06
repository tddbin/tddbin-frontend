import assert from '../_test-helper/assert.js';
import {encode} from '../querystring.js';

describe('encode querystring from object', function() {
  it('create string out of object', function() {
    assert.equal(encode({id: 1, kata: 2}), 'id=1&kata=2');
  });

  it('encode values properly', function() {
    assert.equal(encode({id: '1=2', kata: '2&3'}), 'id=1%3D2&kata=2%263');
  });

});
