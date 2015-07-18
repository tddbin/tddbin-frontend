import assert from 'assert';
import {
  ERROR_LOADING_KATA,
  loadSourceCode
} from '../../load-code-at-startup.js';

const noop = () => {};
describe('load kata', function() {

  it('if given properly', function(done) {
    const kataName = 'es6/language/destructuring/string';
    const setEditorContent = (data) => {
      assert.equal(data.startsWith('// 11: destructuring'), true);
      done();
    };
    loadSourceCode({kataName}, setEditorContent, noop);
  });
  describe('invalid kata name', function() {
    it('hints to the user about not being able to load', function(done) {
      const kataName = 'invalid/kata/name';
      const showUserHint = (data) => {
        assert.equal(data, ERROR_LOADING_KATA);
        done();
      };
      loadSourceCode({kataName}, noop, showUserHint);
    });
  });
});
