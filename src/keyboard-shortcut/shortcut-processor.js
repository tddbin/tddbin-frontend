import {keyboardEventUtil} from './keyboard-event-util';
import {browserEventUtil} from './browser-event-util';

export default class ShortcutProcessor {
  constructor() {
    this._pressedKeys = [];
    this._registeredShortcuts = [];
    keyboardEventUtil.addKeyDownListener(this._keyDown.bind(this));
    keyboardEventUtil.addKeyUpListener(this._keyUp.bind(this));
    browserEventUtil.onWindowBlur(this._fireOnShortcutEndCallback.bind(this));

    this._firstKeyOfCurrentShortcut = null;
    this._onKeyDownCallback = null;
    this._onShortcutEndCallback = null;
  }

  registerShortcut(shortcut) {
    this._registeredShortcuts.push(shortcut);
  }

  registerShortcuts(shortcuts) {
    shortcuts.forEach((shortcut) => {
      this.registerShortcut(shortcut);
    });
  }

  onKeyDown(callback) {
    this._onKeyDownCallback = callback;
  }

  onShortcutEnd(callback) {
    this._onShortcutEndCallback = callback;
  }

  _fireOnKeyDownCallback() {
    if (this._onKeyDownCallback) {
      this._onKeyDownCallback(this._pressedKeys);
    }
  }

  _fireOnShortcutEndCallback() {
    if (this._onShortcutEndCallback) {
      this._onShortcutEndCallback();
    }
  }

  _keyDown(keyName) {
    const isStartOfShortcut = this._pressedKeys.length === 0;
    if (isStartOfShortcut) {
      return this._handlePossibleShortcutStart(keyName);
    }
    return this._handleConsecutiveKey(keyName);
  }

  _handlePossibleShortcutStart(keyName) {
    const isFirstKeyOfRegisteredShortcut = this._registeredShortcuts.some(
        shortcut => shortcut.isStartOfKeyCombo([keyName]));
    if (isFirstKeyOfRegisteredShortcut) {
      this._pressedKeys = [keyName];
      this._firstKeyOfCurrentShortcut = keyName;
      this._fireOnKeyDownCallback();
    }
  }

  _handleConsecutiveKey(keyName) {
    const isFirstKeyRepition = this._pressedKeys.length === 1 && this._pressedKeys[0] === keyName;
    if (isFirstKeyRepition) {
      return null;
    }

    this._pressedKeys.push(keyName);
    this._fireOnKeyDownCallback();

    if (this._isRegisteredShortcut(this._pressedKeys)) {
      return keyboardEventUtil.PREVENT_DEFAULT_ACTION;
    }
    return null;
  }

  _keyUp(keyName) {
    if (this._isEndOfCurrentShortcut(keyName)) {
      this._processFirstMatchingShortcut(this._pressedKeys);
      this._fireOnShortcutEndCallback();
      this._pressedKeys = [];
    }
  }

  _isEndOfCurrentShortcut(keyName) {
    return keyName === this._firstKeyOfCurrentShortcut;
  }

  _processFirstMatchingShortcut(pressedKeys) {
    this._registeredShortcuts.some(shortcut => {
      if (shortcut.isKeyCombo(pressedKeys)) {
        shortcut.fireAssignedCallback();
        return true;
      }
      return false;
    });
  }

  _isRegisteredShortcut(pressedKeys) {
    return this._registeredShortcuts.some(shortcut => shortcut.isKeyCombo(pressedKeys));
  }
}
