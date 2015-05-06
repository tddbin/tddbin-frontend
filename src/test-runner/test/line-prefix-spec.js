import assert from '../../_test-helper/assert';
import {LinePrefix} from '../line-prefix.js';

describe('get a line prefix for pretty printing', function() {
  // there must be `function` here (not =>) so we don't inherit `this` from global :)

  const getPrefix = LinePrefix.getPrefix;

  describe('for max one digit line numbers', () => {
    beforeEach(() => { this.maxDigits = 1; });
    it('line number 1', () => assert.equal(getPrefix(1, this.maxDigits), '  1 | '));
    it('line number 9', () => assert.equal(getPrefix(9, this.maxDigits), '  9 | '));
  });
  describe('for max two digit line numbers', () => {
    beforeEach(() => { this.maxDigits = 2; });
    it('line number 1', () => assert.equal(getPrefix(1, this.maxDigits), '   1 | '));
    it('line number 19', () => assert.equal(getPrefix(19, this.maxDigits), '  19 | '));
  });
  describe('for max three digit line numbers', () => {
    beforeEach(() => { this.maxDigits = 3; });
    it('line number 1', () => assert.equal(getPrefix(1, this.maxDigits), '    1 | '));
    it('line number 99', () => assert.equal(getPrefix(99, this.maxDigits), '   99 | '));
    it('line number 100', () => assert.equal(getPrefix(100, this.maxDigits), '  100 | '));
  });
  it('maxDigits = 4, line number 1', () => assert.equal(getPrefix(1, 4), '     1 | '));
  it('maxDigits = 4, line number 1234', () => assert.equal(getPrefix(1234, 4), '  1234 | '));
});
