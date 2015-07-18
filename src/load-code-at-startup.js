export const ERROR_LOADING_KATA = 'Error loading the kata from ...';
import {loadRemoteFile} from './_external-deps/http-get.js';
export function loadSourceCode({kataName}, setEditorContent, showUserHint) {
  const url = `http://katas.tddbin.com/katas/${kataName}.js`;
  loadRemoteFile(url, (error, data) => {
    if (error) {
      showUserHint(ERROR_LOADING_KATA);
    } else {
      setEditorContent(data);
    }
  });
}
