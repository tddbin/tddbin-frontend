import {assert} from '../_test-helper/assert';
import {StackTrace} from './stack-trace';

describe('StackTrace', function() {

  describe('get first code position', function() {

    const lineOfOrigin = (stackTrace) => new StackTrace(stackTrace).lineOfOrigin();
    const columnOfOrigin = (stackTrace) => new StackTrace(stackTrace).columnOfOrigin();

        var stackTraceDump =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:42:23)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;
        var stackTraceDump1 =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:11:22)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;

    it('line shall be 42', () => assert.equal(lineOfOrigin(stackTraceDump), 42));
    it('line shall be 11', () => assert.equal(lineOfOrigin(stackTraceDump1), 11));
    it('columne shall be 23', () => assert.equal(columnOfOrigin(stackTraceDump), 23));
    it('columne shall be 22', () => assert.equal(columnOfOrigin(stackTraceDump1), 22));
  });
});
