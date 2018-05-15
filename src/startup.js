export default class StartUp {
  constructor(xhrGet, xhrGetDefaultKata) {
    this.xhrGet = xhrGet;
    this.xhrGetDefaultKata = xhrGetDefaultKata;
  }

  loadSourceCode(kataUrl, withSourceCode) {
    const sourceCode = localStorage.getItem('code');
    if (kataUrl) {
      this.loadKataFromUrl(kataUrl, withSourceCode);
    } else if (sourceCode) {
      withSourceCode(sourceCode);
    } else {
      this.loadDefaultKata(withSourceCode);
    }
    window.location.hash = window.location.hash.replace(/kata=([^&]+)/, '');
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
