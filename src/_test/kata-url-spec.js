import assert from '../_test-helper/assert.js';
import KataUrl from '../kata-url.js';

const katasServiceDomain = 'katas.tddbin.test';
const fromQueryString = (queryString) => {
  const kataUrl = new KataUrl(katasServiceDomain);
  kataUrl.initializeFromQueryString(queryString);
  return kataUrl;
};

describe('KataUrl', function() {

  it('create it out of the query string', function() {
    const kataUrlParam = 'kata=my/kata';
    const expectedUrl = `http://${katasServiceDomain}/katas/my/kata.js`;
    assert.equal(fromQueryString(kataUrlParam), expectedUrl);
  });

  describe('if no valid kata is given', function() {
    it('returns a new instance', function() {
      assert.ok(fromQueryString('') instanceof KataUrl);
    });
    it('toString() returns en empty string', function() {
      const kataUrl = fromQueryString('').toString();
      assert.equal(kataUrl, '');
    });
  });

});

describe('report if a kata URL is a ES6 kata', function() {
  it('true if kata starts with `es6/language/`', function() {
    const kataUrlParam = 'kata=es6/language/...';
    const kataUrl = fromQueryString(kataUrlParam);
    assert.equal(kataUrl.isEs6Kata, true);
  });
});
