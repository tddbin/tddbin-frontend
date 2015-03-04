import {LinePrefix} from './line-prefix.js';

export class MarkedLinePrefix extends LinePrefix {
  static getPrefix() {
    var defaultPrefix = LinePrefix.getPrefix(...arguments).substr(1);
    return `>${defaultPrefix}`;
  }
}
