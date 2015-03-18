global.navigator = {platform: 'Mac'};
global.window = {
  location: {hash: ''}
};
global.localStorage = {
  getItem: function() {}
};

import assert from '../../_test-helper/assert';
import {startUp} from '../startup';


describe('start up', () => {
  it('remove kata from the hash', () => {

    startUp({}, function() {});

    assert.equal(global.window.location.hash, '#?');
  });
});
