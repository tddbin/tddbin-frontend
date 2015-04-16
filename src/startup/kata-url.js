export default class KataUrl {
  static fromQueryString(queryString) {
    var kataName = queryString.match(/kata=([^&]+)/);
    if (kataName && kataName.length === 2) {
      kataName = kataName[1];
      return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
    }
  }
}
