import http from 'http';
import https from 'https';
import url from 'url';

export function loadRemoteFile(fileUrl, onLoaded) {
  const isHttps = fileUrl.toLowerCase().startsWith('https');
  const httpModule = (isHttps ? https : http);
  var data = '';
  var options = url.parse(fileUrl);
  options.headers = {
    'User-Agent': '' // api.github.com wants a user-agent header
  };
  options.withCredentials = false;
  var request = httpModule.request(options, function(res) {
    if (res.statusCode !== 200) {
      onLoaded(new Error(`HTTP request failed with status code ${res.statusCode}`));
    } else {
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        onLoaded(null, data);
      });
    }
  });
  request.on('error', function(e) {
    onLoaded(e);
  });
  request.end();
}
