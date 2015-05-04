import atomic from 'atomic';
const myAtomic = atomic(window);

export function xhrGet(url, onError, onSuccess) {
  myAtomic.get(url)
    .success(onSuccess)
    .error(onError)
  ;
}

