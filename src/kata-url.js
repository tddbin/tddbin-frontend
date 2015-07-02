/* global process */
export default class KataUrl {

  constructor() {
    this.kataName = '';
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
