/*
  - pre-process shortcuts into ui-shortcuts (or alike) where 'Meta' is replace by '⌘' etc.
 */

function toPrintableKeys(keys, map) {
  return keys.map(function(key) {
    return map[key] || key;
  });
}

var keyToSignMap = {
  Meta: 'Meta',
  Shift: 'Shift'
};
describe('convert key-strings to key signs', function() {

  it('convert `Meta` to according sign', function() {
    expect(toPrintableKeys(['Meta', 'S'], keyToSignMap)).toEqual([keyToSignMap.Meta, 'S']);
  });

  it('convert `Meta` to according sign', function() {
    expect(toPrintableKeys(['Meta', 'Shift', 'A'], keyToSignMap)).toEqual([keyToSignMap.Meta, keyToSignMap.Shift, 'A']);
  });

});
