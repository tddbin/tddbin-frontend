/* global process */

export default class KataUrl {
  static fromQueryString(queryString) {
    const kataName = parseQueryString(queryString).kata;
    if (kataName) {
      return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
    }
  }
}

function parseQueryString(queryString) {
  const parts = queryString.split('&');
  return parts.reduce(function(query, part) {
    const [key, value] = part.split('=');
    query[key] = decodeURIComponent(value);
    return query;
  }, {});
}
