export const ERROR_LOADING_KATA = 'Error loading the kata from ...';

export default class SourceCodeContent {

  constructor(loadRemoteFile, loadLocalFile, kataUrlFromName, gistUrlById) {
    this._loadRemoteFile = loadRemoteFile;
    this._loadLocalFile = loadLocalFile;
    this._kataUrlFromName = kataUrlFromName;
    this._gistUrlById = gistUrlById;
  }

  load({kataName, gistId}, setEditorContent, showUserHint) {
    if (gistId) {
      this.loadGist(gistId, showUserHint, setEditorContent);
    } else {
      this.loadKata(kataName, showUserHint, setEditorContent);
    }
    this._loadLocalFile('', (err, sourceCode) => {
      if (err) {
        showUserHint(ERROR_LOADING_KATA);
      } else {
        setEditorContent(sourceCode);
      }
    });
  }

  loadKata(kataName, showUserHint, setEditorContent) {
    const url = this._kataUrlFromName(kataName);
    this.loadRemoteFile(url, showUserHint, setEditorContent);
  }

  loadGist(gistId, showUserHint, setEditorContent) {
    const url = this._gistUrlById(gistId);
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
