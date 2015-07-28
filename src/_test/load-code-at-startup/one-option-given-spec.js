import assert from 'assert';
import sinon from 'sinon';
import {
  ERROR_LOADING_KATA,
  default as SourceCodeContent
} from '../../load-code-at-startup.js';
import KataUrl from '../../kata-url.js';

assert.calledOnce = sinon.assert.calledOnce;
assert.calledWith = sinon.assert.calledWith;

const noop = () => {};

const ConfiguredKataUrl = KataUrl.configure('katas.domain');

function loadRemoteSource(loadRemoteFile, loadConfig, setEditorContent, showUserHint) {
  new SourceCodeContent(loadRemoteFile, noop, ConfiguredKataUrl)
    .load(loadConfig, setEditorContent, showUserHint);
}
function loadLocalSource(loadLocalFile, loadConfig, setEditorContent, showUserHint) {
  new SourceCodeContent(noop, loadLocalFile, ConfiguredKataUrl)
    .load(loadConfig, setEditorContent, showUserHint);
}

describe('loading fails', function() {
  it('hints to the user about not being able to load', function() {
    const loadRemoteFile = (url, fn) => {
      fn(new Error());
    };
    const showUserHint = sinon.stub();
    loadRemoteSource(loadRemoteFile, {kataName: 'invalid'}, noop, showUserHint);
    assert.calledWith(showUserHint, ERROR_LOADING_KATA);
  });
});

describe('successful kata loading calls `setEditorContent()`', function() {

  const sourceCode = '// valid source code';
  let setEditorContent;
  beforeEach(function() {
    setEditorContent = sinon.stub();
  });

  describe('for a kata', function() {

    it('returning valid data', function() {
      const loadRemoteFile = (url, fn) => {
        fn(null, sourceCode);
      };
      loadRemoteSource(loadRemoteFile, {kataName: 'valid kata name'}, setEditorContent, noop);
      assert.calledWith(setEditorContent, sourceCode);
    });
    it('calls the `loadRemoteFile` function with the right URL', function() {
      const loadRemoteFile = sinon.stub();
      var kataName = 'kata/name';
      loadRemoteSource(loadRemoteFile, {kataName: kataName}, noop, noop);

      const expectedUrl = ConfiguredKataUrl.fromKataName(kataName).toString();
      assert.calledWith(loadRemoteFile, expectedUrl);
    });
  });

  describe('for a gist', function() {

    const loadRemoteFile = (url, fn) => {
      fn(null, JSON.stringify({files: {'test.js': {content: sourceCode}}}));
    };
    beforeEach(function() {
      loadRemoteSource(loadRemoteFile, {gistId: 'irrelevant'}, setEditorContent, noop);
    });

    it('calls `setEditorContent`', function() {
      assert.calledWith(setEditorContent, sourceCode);
    });
    it('does ONLY load the gist', function() {
      assert.calledOnce(setEditorContent);
    });
    it('calls the `loadRemoteFile` function with the right URL', function() {
      const _loadRemoteFile = sinon.stub();
      var gistId = 'irrelevant';
      loadRemoteSource(_loadRemoteFile, {gistId: gistId}, noop, noop);

      const expectedUrl = `https://api.github.com/gists/${gistId}`;
      assert.calledWith(_loadRemoteFile, expectedUrl);
    });

  });

  describe('load local source', function() {

    describe('for valid id', function() {
      it('it loads the content', function() {
        const loadLocalFile = (id, fn) => {
          fn(null, sourceCode);
        };
        loadLocalSource(loadLocalFile, {localId: 'irrelevant'}, setEditorContent, noop);
        assert.calledWith(setEditorContent, sourceCode);
      });
    });
    describe('for an invalid id', function() {
      let showUserHint;
      beforeEach(function() {
        const loadLocalFile = (id, fn) => {
          fn(new Error());
        };
        showUserHint = sinon.stub();
        loadLocalSource(loadLocalFile, {localId: 'invalid'}, setEditorContent, showUserHint);
      });
      it('shows the error', function() {
        assert.calledWith(showUserHint, ERROR_LOADING_KATA);
      });
      it('does not load any editor content', function() {
        assert.notCalled(setEditorContent);
      });
    });

  });

});

