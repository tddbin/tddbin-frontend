import assert from 'assert';
import sinon from 'sinon';
import {
  ERROR_LOADING_KATA,
  default as SourceCodeContent
} from '../../load-code-at-startup.js';

assert.calledOnce = sinon.assert.calledOnce;
assert.calledWith = sinon.assert.calledWith;

const noop = () => {};

function loadRemoteSource(loadRemoteFile, loadConfig, setEditorContent, showUserHint) {
  new SourceCodeContent(loadRemoteFile, noop)
    .load(loadConfig, setEditorContent, showUserHint);
}
function loadLocalSource(loadLocalFile, loadConfig, setEditorContent, showUserHint) {
  new SourceCodeContent(noop, loadLocalFile)
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

  it('for a kata', function() {
    const loadRemoteFile = (url, fn) => {
      fn(null, sourceCode);
    };
    loadRemoteSource(loadRemoteFile, {kataName: 'valid kata name'}, setEditorContent, noop);
    assert.calledWith(setEditorContent, sourceCode);
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
  });

  describe('load local source', function() {
    it('for valid id', function() {
      const loadLocalFile = (id, fn) => {
        fn(null, sourceCode);
      };
      loadLocalSource(loadLocalFile, {localId: 'irrelevant'}, setEditorContent, noop);
      assert.calledWith(setEditorContent, sourceCode);
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

