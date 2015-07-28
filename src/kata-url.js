export default class KataUrl {

  constructor(katasServiceDomain) {
    this.kataName = '';
    this.katasServiceDomain = katasServiceDomain;
  }

  initializeFromQueryString(queryString) {
    var kataName = queryString.match(/kata=([^&]+)/);
    if (kataName && kataName.length === 2) {
      return this.initializeFromKataName(kataName[1]);
    }
  }

  initializeFromKataName(kataName) {
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
