import assert from '../../_test-helper/assert';
import {toPrintableKeys} from '../util';

const keyToSignMap = {
  Meta: 'Meta',
  Shift: 'Shift',
};
describe('convert key-strings to key signs', () => {

  it('convert `Meta` to according sign', () => {
    assert.deepEqual(toPrintableKeys(['Meta', 'S'], keyToSignMap), [keyToSignMap.Meta, 'S']);
  });

  it('convert multiple matches', () => {
    const expected = [keyToSignMap.Meta, keyToSignMap.Shift, 'A'];
    assert.deepEqual(toPrintableKeys(['Meta', 'Shift', 'A'], keyToSignMap), expected);
  });

  it('leave unmappables as they are', () => {
    assert.deepEqual(toPrintableKeys(['Metas', 'Alt', 'A'], keyToSignMap), ['Metas', 'Alt', 'A']);
  });

});
