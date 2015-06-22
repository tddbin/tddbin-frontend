/* global process */
import assert from '../_test-helper/assert.js';
import KataUrl from '../kata-url.js';

process.env.KATAS_SERVICE_DOMAIN = 'katas.tddbin.test';

describe('KataUrl', function() {

  it('create it from the kata name', function() {
    const kataName = 'my/kata';
    const expectedUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/my/kata.js`;
    assert.equal(KataUrl.fromKataName(kataName), expectedUrl);
  });

  describe('if no valid kata is given', function() {
    it('returns a new instance', function() {
      assert.ok(KataUrl.fromKataName('') instanceof KataUrl);
    });
    it('toString() returns en empty string', function() {
      const kataUrl = KataUrl.fromKataName('').toString();
      assert.equal(kataUrl, '');
    });
  });

});

describe('report if a kata URL is a ES6 kata', function() {
  it('true if kata starts with `es6/language/`', function() {
    const kataName = 'es6/language/...';
    const kataUrl = KataUrl.fromKataName(kataName);
    assert.equal(kataUrl.isEs6Kata, true);
  });
});
