/* global process */
export default class KataUrl {

  constructor() {
    this.kataName = '';
  }

  static fromQueryString(queryString) {
    const kataName = queryString.match(/kata=([^&]+)/);
    if (kataName && kataName.length === 2) {
      return KataUrl.fromKataName(kataName[1]);
    }
    return new KataUrl();
  }

  static fromKataName(kataName) {
    let kataUrl = new KataUrl();
    kataUrl.kataName = kataName;
    return kataUrl;
  }

  toString() {
    if (this.kataName) {
      return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${this.kataName}.js`;
    }
    return '';
  }

  get isEs6Kata() {
    return this.kataName.startsWith('es6/language/');
  }
}
