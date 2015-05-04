export default class Shortcut {

  constructor(keys, fn, helpText) {
    this._keys = keys;
    this._fn = fn;
    this.helpText = helpText;
    this._printableKeysFormatter = null;
  }

  isStartOfKeyCombo(pressedKeys) {
    var shortcut = this._keys;
    return pressedKeys.every((key, idx) => shortcut[idx] === key);
  }

  isKeyCombo(pressedKeys) {
    return pressedKeys.join('+') === this._keys.join('+');
  }

  fireAssignedCallback() {
    this._fn();
  }

  set printableKeysFormatter(formatterFunction) {
    this._printableKeysFormatter = formatterFunction;
  }

  get printableKeys() {
    var format = this._printableKeysFormatter;
    var keys = this._keys;
    if (format) {
      keys = format(this._keys);
    }
    return keys.join('+');
  }
}
