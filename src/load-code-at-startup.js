
export function loadSourceCode(remoteSourceCode, options) {
  if (options.gistId) {
    remoteSourceCode.loadFromGist(options.gistId);
    return;
  }
  if (options.kataPath) {
    remoteSourceCode.loadKata(options.kataPath);
  }
  remoteSourceCode.loadFromLocal(options.localStoreId);
}
