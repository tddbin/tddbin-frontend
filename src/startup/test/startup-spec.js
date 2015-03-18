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

describe('start up', function() {

  it('remove kata from the hash', () => {
    global.window.location.hash = '#?kata=somekata';

    startUp(noop, (_, _1, onSuccess) => onSuccess(''));

    assert.equal(global.window.location.hash, '#?');
  });

  it('if there is no kata in the URL get it from localStorage', function() {
    global.window.location.hash = '#?';
    global.localStorage = {
      getItem: () => 'kata code'
    };
    const withSourceCode = this.sinon.spy();

    startUp(withSourceCode, noop);

    assert.calledWith(withSourceCode, 'kata code');
  });

});
