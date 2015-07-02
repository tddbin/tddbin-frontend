export function updateUrl(queryString) {
  window.history.pushState({}, null, queryString);
}
