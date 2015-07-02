export default class StartUp {
  constructor(xhrGet, xhrGetDefaultKata) {
    this.xhrGet = xhrGet;
    this.xhrGetDefaultKata = xhrGetDefaultKata;
  }

  loadSourceCode(fromLocalStorage, kataUrl, withSourceCode) {
    if (fromLocalStorage) {
      var sourceCode = localStorage.getItem('code');
      withSourceCode(sourceCode);
    } else if (kataUrl) {
      this.loadKataFromUrl(kataUrl, withSourceCode);
    } else {
      this.loadDefaultKata(withSourceCode);
    }
  }

  loadDefaultKata(onLoaded) {
    this.xhrGetDefaultKata(
      (_, {status}) =>
        onLoaded(`// Default kata not found (status ${status})\n// Maybe try a different kata (see URL).`),
      data => { onLoaded(data); }
    );
  }

  loadKataFromUrl(kataUrl, onLoaded) {
    this.xhrGet(
      kataUrl,
      (_, {status}) =>
        onLoaded(`// Kata at "${kataUrl}" not found (status ${status})\n// Maybe try a different kata (see URL).`),
      data => { onLoaded(data); }
    );
  }

}
