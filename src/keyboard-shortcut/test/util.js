import sinon from 'sinon';
import {keyboardEventUtil} from '../keyboard-event-util';
import {browserEventUtil} from '../browser-event-util';

export const windowBlurStub = sinon.stub(browserEventUtil, 'onWindowBlur');
export const keyDownStub = sinon.stub(keyboardEventUtil, 'addKeyDownListener');
export const keyUpStub = sinon.stub(keyboardEventUtil, 'addKeyUpListener');

export class KeyPressEmulation {
  constructor() {
    this._keyDownListeners = [];
    this._keyUpListeners = [];
    keyDownStub.callsFake((fn) => this._keyDownListeners.push(fn));
    keyUpStub.callsFake((fn) => this._keyUpListeners.push(fn));
  }

  keyDownByKeyName(keyName) {
    this._keyDownListeners[0](keyName);
  }

  keyUpByKeyName(keyName) {
    this._keyUpListeners[0](keyName);
  }

  keyDownByKeyNames(keyNames) {
    keyNames.forEach((...args) => { this.keyDownByKeyName(...args); });
  }

  keyUpByKeyNames(keyNames) {
    keyNames.forEach((...args) => { this.keyUpByKeyName(...args); });
  }

  pressByKeyNames(keyNames) {
    // The first key is (normally) the Meta key, don't fire keyUp yet,
    // fire it only at the end of it all.
    const firstKeyName = keyNames[0];
    this._keyDownListeners[0](firstKeyName);

    // Fire all keyDowns and keyUps.
    keyNames.slice(1).forEach((key) => {
      this._keyDownListeners[0](key);
      this._keyUpListeners[0](key);
    });

    this.keyUpByKeyName(firstKeyName);
  }

}
