export const startUp = function(withKataSourceCode, xhrGet) {

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
    const kataName = 'es5/mocha+assert/assert-api';
    const kataUrl = `http://${process.env.KATAS_SERVICE_DOMAIN}/katas/${kataName}.js`;
    loadKataFromUrl(kataUrl, onLoaded);
  };

  const loadKataFromUrl = (kataUrl, onLoaded) => {
    xhrGet(kataUrl,
      (e, xhr) => {
        if (xhr.status === 404) {
          onLoaded(`// 404, Kata at "${kataUrl}" not found\n// Maybe try a different kata (see URL).`);
        } else {
          onLoaded('// not kata found :(');
        }
      },
      (data) => onLoaded(data)
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
