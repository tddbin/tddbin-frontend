const kataName = 'es5/mocha+assert/assert-api';
export const DEFAULT_KATA_URL = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;

export const startUp = function(withKataSourceCode, xhrGet, xhrGetDefaultKata) {

  const queryString = window.location.hash.replace(/^#\?/, '');

  const getSourceCode = () => {
    var kataUrl = getKataUrl();
    var sourceCode = localStorage.getItem('code');
    if (kataUrl) {
      loadKataFromUrl(kataUrl, withKataSourceCode);
    } else if (sourceCode) {
      withKataSourceCode(sourceCode);
    } else {
      loadDefaultKata(withKataSourceCode);
    }
    window.location.hash = window.location.hash.replace(/kata=([^&]+)/, '');
  };

  const loadDefaultKata = (onLoaded) => {
    xhrGetDefaultKata(
      (_, {status}) => onLoaded(`// Kata at "${kataUrl}" not found (status ${status})\n// Maybe try a different kata (see URL).`),
      data => {onLoaded(data)}
    );
  };

  const loadKataFromUrl = (kataUrl, onLoaded) => {
    xhrGet(
      kataUrl,
      (_, {status}) => onLoaded(`// Kata at "${kataUrl}" not found (status ${status})\n// Maybe try a different kata (see URL).`),
      data => {onLoaded(data)}
    );
  };

  const getKataUrl = () => {
    var kataName = queryString.match(/kata=([^&]+)/);
    if (kataName && kataName.length === 2) {
      kataName = kataName[1];
      return `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
    }
  };

  getSourceCode();

};

export default class StartUp {
  constructor(xhrGet, xhrGetDefaultKata) {
    this.xhrGet = xhrGet;
    this.xhrGetDefaultKata = xhrGetDefaultKata;
  }

  loadSourceCode(withSourceCode) {
    startUp(withSourceCode, this.xhrGet, this.xhrGetDefaultKata);
  }
}
