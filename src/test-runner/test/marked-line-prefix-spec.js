import assert from '../../_test-helper/assert';
import {MarkedLinePrefix} from '../line-prefix.js';

describe('MarkedLinePrefix', () => {

  const getPrefix = MarkedLinePrefix.getPrefix;

  describe('has the `>` in front', () => {
    it('line number 1', () => assert.equal(getPrefix(1, 1), '> 1 | '));
    it('line number 1234', () => assert.equal(getPrefix(1234, 4), '> 1234 | '));
  });
});
