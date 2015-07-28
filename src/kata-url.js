export default class KataUrl {

  constructor(katasServiceDomain) {
    this.kataName = '';
    this.katasServiceDomain = katasServiceDomain;
  }

  fromQueryString(queryString) {
    var kataName = queryString.match(/kata=([^&]+)/);
    if (kataName && kataName.length === 2) {
      return this.fromKataName(kataName[1]);
    }
  }

  fromKataName(kataName) {
    this.kataName = kataName;
  }

  toString() {
    if (this.kataName) {
      return `http://${this.katasServiceDomain}/katas/${this.kataName}.js`;
    }
    return '';
  }

  get isEs6Kata() {
    return this.kataName.startsWith('es6/language/');
  }
}
