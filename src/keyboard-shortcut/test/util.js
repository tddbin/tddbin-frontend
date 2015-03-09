import {keyboardEventUtil} from '../keyboard-event-util';

export class KeyPressEmulation {
  constructor(sinon) {
    this._keyDownListeners = [];
    this._keyUpListeners = [];
    sinon.stub(keyboardEventUtil, 'addKeyDownListener', (fn) => this._keyDownListeners.push(fn));
    sinon.stub(keyboardEventUtil, 'addKeyUpListener', (fn) => this._keyUpListeners.push(fn));
  }

  keyDownByKeyName(keyName) {
    this._keyDownListeners[0](keyName);
  }

  keyUpByKeyName(keyName) {
    this._keyUpListeners[0](keyName);
  }

  keyDownByKeyNames(keyNames) {
    keyNames.forEach((...args) => { this.keyDownByKeyName(...args)});
  }

  keyUpByKeyNames(keyNames) {
    keyNames.forEach((...args) => { this.keyUpByKeyName(...args)});
  }

  pressByKeyNames(keyNames) {
    // The first key is (normally) the Meta key, don't fire keyUp yet,
    // fire it only at the end of it all.
    var firstKeyName = keyNames[0];
    this._keyDownListeners[0](firstKeyName);

    // Fire all keyDowns and keyUps.
    keyNames.slice(1).forEach((key) => {
      this._keyDownListeners[0](key);
      this._keyUpListeners[0](key);
    });

    this.keyUpByKeyName(firstKeyName);
  }

}
