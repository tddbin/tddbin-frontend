import assert from 'assert';
import sinon from 'sinon';
import {
  ERROR_LOADING_KATA,
  loadSourceCode
} from '../../load-code-at-startup.js';

assert.calledOnce = sinon.assert.calledOnce;

const noop = () => {};
describe('load kata', function() {

  it('if given properly', function(done) {
    const loadRemoteFile = (url, fn) => {
      fn(null, '// 11: destructuring');
    };
    const kataName = 'es6/language/destructuring/string';
    const setEditorContent = (data) => {
      assert.equal(data.startsWith('// 11: destructuring'), true);
      done();
    };
    loadSourceCode(loadRemoteFile, {kataName}, setEditorContent, noop);
  });
  describe('invalid kata name', function() {
    it('hints to the user about not being able to load', function(done) {
      const loadRemoteFile = (url, fn) => {
        fn(new Error());
      };
      const kataName = 'invalid/kata/name';
      const showUserHint = (data) => {
        assert.equal(data, ERROR_LOADING_KATA);
        done();
      };
      loadSourceCode(loadRemoteFile, {kataName}, noop, showUserHint);
    });
  });
});

describe('load gist', function() {
  it('if request succeeds', function() {
    const loadRemoteFile = (url, fn) => {
      fn(null, JSON.stringify({files: {'test.js': {content: '// just a test'}}}));
    };
    const gistId = 'a046034f74679e2d4057';
    const setEditorContent = (data) => {
      assert.equal(data.startsWith('// just a test'), true);
    };
    loadSourceCode(loadRemoteFile, {gistId}, setEditorContent, noop);
  });
  it('does ONLY load the gist', function() {
    const loadRemoteFile = (url, fn) => {
      fn(null, JSON.stringify({files: {'test.js': {content: 'valid content'}}}));
    };
    const setEditorContent = sinon.stub();

    loadSourceCode(loadRemoteFile, {gistId: 'irrelevant'}, setEditorContent, noop);
    assert.calledOnce(setEditorContent);
  });
// todo
  //it('if request fails', function(done) {
  //  const gistId = 'invalid-gist-id';
  //  const showUserHint = (data) => {
  //    assert.equal(data.startsWith('// just a test'), true);
  //    done();
  //  };
  //  loadSourceCode({gistId}, noop, showUserHint);
  //});
});
