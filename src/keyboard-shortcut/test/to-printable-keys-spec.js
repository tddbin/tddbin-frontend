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
    expect(toPrintableKeys(['Meta', 'S'], keyToSignMap)).toEqual([keyToSignMap.Meta, 'S']);
  });

  it('convert multiple matches', function() {
    expect(toPrintableKeys(['Meta', 'Shift', 'A'], keyToSignMap)).toEqual([keyToSignMap.Meta, keyToSignMap.Shift, 'A']);
  });

  it('leave unmappables as they are', function() {
    expect(toPrintableKeys(['Metas', 'Alt', 'A'], keyToSignMap)).toEqual(['Metas', 'Alt', 'A']);
  });

});
