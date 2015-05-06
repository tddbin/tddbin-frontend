/* global process */

import {decode as parseQueryString} from './querystring.js';

export default class KataUrl {
  static fromQueryString(queryString) {
    const kataName = parseQueryString(queryString).kata;
    if (kataName) {
      return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
    }
  }
}
