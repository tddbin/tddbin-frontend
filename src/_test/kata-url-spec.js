/* global process */
import assert from '../_test-helper/assert.js';
import KataUrl from '../kata-url.js';

process.env.KATAS_SERVICE_DOMAIN = 'katas.tddbin.test';

describe('KataUrl', () => {

  it('create it out of the query string', () => {
    const kataUrlParam = 'kata=my/kata';
    const expectedUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/my/kata.js`;
    assert.equal(KataUrl.fromQueryString(kataUrlParam), expectedUrl);
  });

  describe('if no valid kata is given', () => {
    it('returns a new instance', () => {
      assert.ok(KataUrl.fromQueryString('') instanceof KataUrl);
    });
    it('toString() returns en empty string', () => {
      const kataUrl = KataUrl.fromQueryString('').toString();
      assert.equal(kataUrl, '');
    });
  });

});

describe('report if a kata URL is a ES6 kata', () => {
  it('true if kata starts with `es6/language/`', () => {
    const kataUrlParam = 'kata=es6/language/...';
    const kataUrl = KataUrl.fromQueryString(kataUrlParam);
    assert.equal(kataUrl.isEs6Kata, true);
  });
});
