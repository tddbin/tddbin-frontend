import assert from '../../_test-helper/assert';
import KataUrl from '../kata-url';

process.env.KATAS_SERVICE_DOMAIN = 'katas.tddbin.test';

describe('get kata from katas.tddbin.com', function() {

  it('request from the right URL', function() {
    const kataUrlParam = 'kata=my/kata';
    const expectedUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/my/kata.js`;
    assert.equal(KataUrl.fromQueryString(kataUrlParam), expectedUrl);
  });

});

