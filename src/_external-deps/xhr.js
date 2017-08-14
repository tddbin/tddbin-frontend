import atomic from 'atomic';

export function xhrGet(url, onError, onSuccess) {
  atomic.ajax({method: 'GET', url, responseType: ''})
    .success(onSuccess)
    .error(onError)
  ;
}

