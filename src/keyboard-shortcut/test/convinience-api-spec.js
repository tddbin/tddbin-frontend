import assert from '../../_test-helper/assert';
import {Shortcut} from '../shortcut';
var ShortcutProcessor = require('../shortcut-processor');
import {keyboardEventUtil} from '../keyboard-event-util';
import {browserEventUtil} from '../browser-event-util';
var util = require('./util');

var noop = function() {};

describe('registering multiple shortcuts', function() {
  it('shall work', function() {
    // TODO simplify the necessary mocking for every shortcut test
    //spyOn(browserEventUtil, 'onWindowBlur');
    this.sinon.stub(browserEventUtil, 'onWindowBlur');
    new util.KeyPressEmulation(keyboardEventUtil, this.sinon);
    var processor = new ShortcutProcessor();
    this.sinon.stub(processor, 'registerShortcut');

    var shortcutMap = [
      new Shortcut(['Meta', 'S'], noop),
      new Shortcut(['Ctrl', 'S'], noop)
    ];
    processor.registerShortcuts(shortcutMap);

    assert.calledWith(processor.registerShortcut, shortcutMap[0]);
    assert.calledWith(processor.registerShortcut, shortcutMap[1]);
  });
});
