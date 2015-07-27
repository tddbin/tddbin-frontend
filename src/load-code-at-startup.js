export const ERROR_LOADING_KATA = 'Error loading the kata from ...';

export default class SourceCodeContent {

  constructor(loadRemoteFile, loadLocalFile, KataUrl) {
    this._loadRemoteFile = loadRemoteFile;
    this._loadLocalFile = loadLocalFile;
    this._KataUrl = KataUrl;
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
    const url = this._KataUrl.fromKataName(kataName).toString();
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
