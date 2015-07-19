import http from 'http';
import https from 'https';
import url from 'url';

export function loadRemoteFile(fileUrl, onLoaded) {
  const module = httpOrHttpsModule(fileUrl);
  const options = buildOptions(fileUrl);
  const request = module.request(options, processResponse.bind(null, onLoaded));
  request.on('error', onLoaded);
  request.end();
}

function httpOrHttpsModule(fileUrl) {
  const isHttps = fileUrl.toLowerCase().startsWith('https');
  return (isHttps ? https : http);
}

function processResponse(onLoaded, res) {
  const statusCode = res.statusCode;
  if (statusCode === 200) {
    handle200Response(res, onLoaded);
    return;
  }
  const message = `HTTP request failed with status code ${statusCode}`;
  onLoaded(new Error(message));
}

function handle200Response(res, onLoaded) {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { onLoaded(null, data); });
}

function buildOptions(fileUrl) {
  var options = url.parse(fileUrl);
  options.headers = {
    'User-Agent': '' // api.github.com wants a user-agent header
  };
  options.withCredentials = false;
  return options;
}
