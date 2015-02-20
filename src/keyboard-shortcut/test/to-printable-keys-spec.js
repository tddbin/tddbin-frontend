var assert = require('../../_test-helper/assert');
/*
  - pre-process shortcuts into ui-shortcuts (or alike) where 'Meta' is replace by '⌘' etc.
 */
var toPrintableKeys = require('../util').toPrintableKeys;

var keyToSignMap = {
  Meta: 'Meta',
  Shift: 'Shift'
};
describe('convert key-strings to key signs', function() {

  it('convert `Meta` to according sign', function() {
    assert.deepEqual(toPrintableKeys(['Meta', 'S'], keyToSignMap), [keyToSignMap.Meta, 'S']);
  });

  it('convert multiple matches', function() {
    var expected = [keyToSignMap.Meta, keyToSignMap.Shift, 'A'];
    assert.deepEqual(toPrintableKeys(['Meta', 'Shift', 'A'], keyToSignMap), expected);
  });

  it('leave unmappables as they are', function() {
    assert.deepEqual(toPrintableKeys(['Metas', 'Alt', 'A'], keyToSignMap), ['Metas', 'Alt', 'A']);
  });

});
