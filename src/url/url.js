import querystring from 'querystring';

function objectToMap(obj) {
  let map = new Map();
  for (let key of Object.keys(obj)) {
    map.set(key, obj[key]);
  }
  return map;
}

export default class Url {
  static inject(updateUrl) {
    let url = new Url();
    url._updateUrl = updateUrl;
    return url;
  }
  initializeFromLocation(location) {
    this.initalizeHash(location.hash);
    this.initalizeQuery(location.search);
  }
  initalizeHash(hash='') {
    if (hash.startsWith('#?')) {
      hash = hash.substr(2);
    }
    this.hash = objectToMap(querystring.parse(hash));
  }
  initalizeQuery(query='') {
    if (query.startsWith('?')) {
      query = query.substr(1);
    }
    this.query = objectToMap(querystring.parse(query));
  }
  copyHashIntoQuery() {
    this.query = this.hash;
  }
  setValueInQuery(key, value) {
    this.query.set(key, value);
  }
}

