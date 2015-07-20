export const ERROR_LOADING_KATA = 'Error loading the kata from ...';

export function loadSourceCode(loadRemoteFile, {kataName, gistId}, setEditorContent, showUserHint) {
  new SourceCodeContent(loadRemoteFile)
    .load({kataName, gistId}, setEditorContent, showUserHint);
}

export default class SourceCodeContent {

  constructor(loadRemoteFile) {
    this._loadRemoteFile = loadRemoteFile;
  }

  load({kataName, gistId}, setEditorContent, showUserHint) {
    if (gistId) {
      this.loadGist(gistId, showUserHint, setEditorContent);
    } else {
      this.loadKata(kataName, showUserHint, setEditorContent);
    }
  }

  loadKata(kataName, showUserHint, setEditorContent) {
    const url = `http://katas.tddbin.com/katas/${kataName}.js`;
    this.loadRemoteFile(url, showUserHint, setEditorContent);
  }

  loadGist(gistId, showUserHint, setEditorContent) {
    const url = `https://api.github.com/gists/${gistId}`;
    this.loadRemoteFile(url, showUserHint, (data) => {
      setEditorContent(JSON.parse(data).files['test.js'].content);
    });
  }

  loadRemoteFile(url, onError, onSuccess) {
    this._loadRemoteFile(url, (error, data) => {
      if (error) {
        onError(ERROR_LOADING_KATA);
      } else {
        onSuccess(data);
      }
    });
  }

}
