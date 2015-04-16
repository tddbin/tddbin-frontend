import KataUrl from './kata-url.js'

export default class StartUp {
  constructor(xhrGet, xhrGetDefaultKata) {
    this.xhrGet = xhrGet;
    this.xhrGetDefaultKata = xhrGetDefaultKata;
  }

  loadSourceCode(withSourceCode) {

    const getSourceCode = () => {
      const queryString = window.location.hash.replace(/^#\?/, '');
      var kataUrl = KataUrl.fromQueryString(queryString);
      var sourceCode = localStorage.getItem('code');
      if (kataUrl) {
        this.loadKataFromUrl(kataUrl, withSourceCode);
      } else if (sourceCode) {
        withSourceCode(sourceCode);
      } else {
        this.loadDefaultKata(withSourceCode);
      }
      window.location.hash = window.location.hash.replace(/kata=([^&]+)/, '');
    };

    getSourceCode();
  }

  loadDefaultKata(onLoaded) {
    this.xhrGetDefaultKata(
      (_, {status}) => onLoaded(`// Default kata not found (status ${status})\n// Maybe try a different kata (see URL).`),
      data => {onLoaded(data)}
    );
  }

  loadKataFromUrl(kataUrl, onLoaded) {
    this.xhrGet(
      kataUrl,
      (_, {status}) => onLoaded(`// Kata at "${kataUrl}" not found (status ${status})\n// Maybe try a different kata (see URL).`),
      data => {onLoaded(data)}
    );
  }

}
