import assert from 'assert';
import sinon from 'sinon';
import {
  ERROR_LOADING_KATA,
  loadSourceCode
} from '../../load-code-at-startup.js';

assert.calledOnce = sinon.assert.calledOnce;
assert.calledWith = sinon.assert.calledWith;

const noop = () => {};

describe('loading fails', function() {
  it('hints to the user about not being able to load', function() {
    const loadRemoteFile = (url, fn) => {
      fn(new Error());
    };
    const showUserHint = sinon.stub();
    loadSourceCode(loadRemoteFile, {kataName: 'invalid'}, noop, showUserHint);
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
    loadSourceCode(loadRemoteFile, {kataName: 'valid kata name'}, setEditorContent, noop);
    assert.calledWith(setEditorContent, sourceCode);
  });

  describe('for a gist', function() {

    const loadRemoteFile = (url, fn) => {
      fn(null, JSON.stringify({files: {'test.js': {content: sourceCode}}}));
    };
    beforeEach(function() {
      loadSourceCode(loadRemoteFile, {gistId: 'irrelevant'}, setEditorContent, noop);
    });

    it('calls `setEditorContent`', function() {
      assert.calledWith(setEditorContent, sourceCode);
    });
    it('does ONLY load the gist', function() {
      assert.calledOnce(setEditorContent);
    });
  });
});

//describe('load local source', function() {
//  it('for valid id', function() {
//    const sourceCode = 'source code';
//    const loadLocalFile = (id, fn) => {
//      fn(null, sourceCode);
//    };
//    const localId = 'valid id';
//    const setEditorContent = (data) => {
//      assert.equal(data, sourceCode);
//    };
//    loadSourceCode(loadLocalFile, {localId}, setEditorContent, noop);
//  });
//});
