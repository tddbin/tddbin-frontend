import querystring from 'querystring';

function objectToMap(obj) {
  let map = new Map();
  for (let key of Object.keys(obj)) {
    map.set(key, obj[key]);
  }
  return map;
}
function mapToObject(map) {
  let obj = {};
  map.forEach((value, key) => { obj[key] = value; });
  return obj;
}

export default class Url {
  static inject(updateUrl) {
    let url = new Url();
    url._updateUrl = updateUrl;
    return url;
  }
  initializeFromLocation(location) {
    this.initializeHash(location.hash);
    this.initializeQuery(location.search);
  }
  initializeHash(hash='') {
    if (hash.startsWith('#?')) {
      hash = hash.substr(2);
    }
    this.hash = objectToMap(querystring.parse(hash));
  }
  initializeQuery(query='') {
    if (query.startsWith('?')) {
      query = query.substr(1);
    }
    this.query = objectToMap(querystring.parse(query));
  }
  copyHashIntoQuery() {
    this.query = this.hash;
    this._updateUrl('?' + querystring.stringify(mapToObject(this.query)));
  }
  setValueInQuery(key, value) {
    this.query.set(key, value);
    this._updateUrl('?' + querystring.stringify(mapToObject(this.query)));
  }
}

