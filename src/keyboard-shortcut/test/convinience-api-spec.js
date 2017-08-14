import assert from '../../_test-helper/assert';
import Shortcut from '../shortcut';
import ShortcutProcessor from '../shortcut-processor';
import {browserEventUtil} from '../browser-event-util';
import {KeyPressEmulation} from './util';

const noop = function() {};

describe('registering multiple shortcuts', function() {
  it('shall work', function() {
    // TODO simplify the necessary mocking for every shortcut test
    //spyOn(browserEventUtil, 'onWindowBlur');
    this.sinon.stub(browserEventUtil, 'onWindowBlur');
    new KeyPressEmulation(this.sinon); //eslint-disable-line no-new
    const processor = new ShortcutProcessor();
    this.sinon.stub(processor, 'registerShortcut');

    const shortcutMap = [
      new Shortcut(['Meta', 'S'], noop),
      new Shortcut(['Ctrl', 'S'], noop),
    ];
    processor.registerShortcuts(shortcutMap);

    assert.calledWith(processor.registerShortcut, shortcutMap[0]);
    assert.calledWith(processor.registerShortcut, shortcutMap[1]);
  });
});
