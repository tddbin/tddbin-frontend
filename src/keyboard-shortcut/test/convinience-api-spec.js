import assert from '../../_test-helper/assert';
import Shortcut from '../shortcut';
import ShortcutProcessor from '../shortcut-processor';
import {KeyPressEmulation} from './util';
import sinon from 'sinon';

const noop = function() {};

describe('registering multiple shortcuts', function() {
  it('shall work', function() {
    // TODO simplify the necessary mocking for every shortcut test
    new KeyPressEmulation(); //eslint-disable-line no-new
    const processor = new ShortcutProcessor();
    sinon.spy(processor, 'registerShortcut');

    const shortcutMap = [
      new Shortcut(['Meta', 'S'], noop),
      new Shortcut(['Ctrl', 'S'], noop),
    ];
    processor.registerShortcuts(shortcutMap);

    assert.calledWith(processor.registerShortcut, shortcutMap[0]);
    assert.calledWith(processor.registerShortcut, shortcutMap[1]);
  });
});
