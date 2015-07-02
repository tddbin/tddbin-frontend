export default class UrlState {

  static useUrl(url) {
    var urlState = new UrlState();
    urlState.url = url;
    return urlState;
  }
  initialize() {
    if (this.url.hash.size > 0) {
      this.url.copyHashIntoQuery();
    }
  }

  markKataAsStoredLocally() {
    this.url.setValueInQuery('storedLocally', 1);
  }

  get kataName() {
    return this.url.query.get('kata');
  }

  get isKataStoredLocally() {
    return !!this.url.query.get('storedLocally');
  }

}
