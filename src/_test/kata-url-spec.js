/* global process */
import assert from '../_test-helper/assert.js';
import KataUrl from '../kata-url.js';

process.env.KATAS_SERVICE_DOMAIN = 'katas.tddbin.test';

describe('get kata from katas.tddbin.com', function() {

  it('request from the right URL', function() {
    const kataUrlParam = 'kata=my/kata';
    const expectedUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/my/kata.js`;
    assert.equal(KataUrl.fromQueryString(kataUrlParam), expectedUrl);
  });

  it('make sure even `wrong` encoded URLs decode', function() {
    const kataUrlParam = 'kata=es5/mocha+assert/assert-api';
    const expectedUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/es5/mocha+assert/assert-api.js`;
    assert.equal(KataUrl.fromQueryString(kataUrlParam), expectedUrl);
  });

  it('make sure even `properly` encoded URLs decode', function() {
    const kataUrlParam = 'kata=es5%2Fmocha%2Bassert%2Fassert-api';
    const expectedUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/es5/mocha+assert/assert-api.js`;
    assert.equal(KataUrl.fromQueryString(kataUrlParam), expectedUrl);
  });

});

