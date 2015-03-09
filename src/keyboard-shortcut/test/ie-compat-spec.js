'use strict';

import assert from '../../_test-helper/assert';
import {Shortcut} from '../shortcut';
var ShortcutProcessor = require('../shortcut-processor');
import {keyboardEventUtil} from '../keyboard-event-util';
import {browserEventUtil} from '../browser-event-util';
var util = require('./util');

describe('IE specifics', function() {

  var keyPressEmulation;
  beforeEach(function() {
    this.sinon.stub(browserEventUtil, 'onWindowBlur');
    keyPressEmulation = new util.KeyPressEmulation(keyboardEventUtil, this.sinon);
  });

  it('ignore multiple consecutive keydown-events for Control, Alt, etc.', function() {
    var callback = this.sinon.spy();

    var processor = new ShortcutProcessor();
    processor.registerShortcut(new Shortcut(['Control', 'S'], callback));

    // Fire `Control` key as Windows does, multiple times when being held down.
    keyPressEmulation.keyDownByKeyNames(['Control', 'Control', 'Control', 'S']);
    keyPressEmulation.keyUpByKeyNames(['S', 'Control']);

    assert.called(callback);
  });

});
