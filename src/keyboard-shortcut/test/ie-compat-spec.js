import assert from '../../_test-helper/assert';
import Shortcut from '../shortcut';
import ShortcutProcessor from '../shortcut-processor';
import {browserEventUtil} from '../browser-event-util';
import {KeyPressEmulation} from './util';

describe('IE specifics', function() {

  let keyPressEmulation;
  beforeEach(function() {
    this.sinon.stub(browserEventUtil, 'onWindowBlur');
    keyPressEmulation = new KeyPressEmulation(this.sinon);
  });

  it('ignore multiple consecutive keydown-events for Control, Alt, etc.', function() {
    const callback = this.sinon.spy();

    const processor = new ShortcutProcessor();
    processor.registerShortcut(new Shortcut(['Control', 'S'], callback));

    // Fire `Control` key as Windows does, multiple times when being held down.
    keyPressEmulation.keyDownByKeyNames(['Control', 'Control', 'Control', 'S']);
    keyPressEmulation.keyUpByKeyNames(['S', 'Control']);

    assert.called(callback);
  });

});
