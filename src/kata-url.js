/* global process */
import {parse as parseQueryString} from 'query-string';

export default class KataUrl {
  static fromQueryString(queryString) {
    const kataName = parseQueryString(queryString).kata;
    if (kataName) {
      return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
    }
  }
}
