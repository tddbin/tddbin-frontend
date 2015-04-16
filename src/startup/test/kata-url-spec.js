import assert from '../../_test-helper/assert';
import KataUrl from '../kata-url';

process.env.KATAS_SERVICE_DOMAIN = 'katas.tddbin.test';

describe.only('get kata from katas.tddbin.com', function() {

  it('request from the right URL', function() {
    const kataUrlParam = 'kata=my/kata';
    const kataUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/my/kata.js`;
    assert.equal(KataUrl.fromQueryString(kataUrlParam), kataUrl);
  });

});

