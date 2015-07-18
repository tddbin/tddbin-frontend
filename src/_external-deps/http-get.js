import http from 'http';
import url from 'url';

export function loadRemoteFile(fileUrl, onLoaded) {
  var data = '';
  var options = url.parse(fileUrl);
  options.withCredentials = false;
  var request = http.request(options, function(res) {
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
