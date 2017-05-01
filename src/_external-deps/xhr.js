import atomic from 'atomic';

export function xhrGet(url, onError, onSuccess) {
  atomic.ajax({method: 'GET', url: url, responseType: 'document'})
    .success(onSuccess)
    .error(onError)
  ;
}

