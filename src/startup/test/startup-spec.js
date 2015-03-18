global.navigator = {platform: 'Mac'};
global.window = {
  location: {hash: ''}
};
global.localStorage = {
  getItem: function() {}
};

import assert from '../../_test-helper/assert';
import {startUp} from '../startup';

const noop = function() {};

describe('start up', () => {
  it('remove kata from the hash', () => {

    global.window.location.hash = '#?kata=somekata';

    startUp(noop, (_, _1, onSuccess) => onSuccess(''));

    assert.equal(global.window.location.hash, '#?');
  });
});
