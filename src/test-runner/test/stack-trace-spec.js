import assert from '../../_test-helper/assert';
import {StackTrace} from '../stack-trace';

describe('StackTrace', () => {

  describe('get first code position', () => {

    const lineOfOrigin = (stackTrace) => new StackTrace(stackTrace).lineOfOrigin();
    const columnOfOrigin = (stackTrace) => new StackTrace(stackTrace).columnOfOrigin();

    const stackTraceDump =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:42:23)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;
    const stackTraceDump1 =
`ReferenceError: y is not defined
    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:11:22)
    at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:5)
`;

    it('line shall be 42', () => assert.strictEqual(lineOfOrigin(stackTraceDump), 42));
    it('line shall be 11', () => assert.strictEqual(lineOfOrigin(stackTraceDump1), 11));
    it('columne shall be 23', () => assert.strictEqual(columnOfOrigin(stackTraceDump), 23));
    it('columne shall be 22', () => assert.strictEqual(columnOfOrigin(stackTraceDump1), 22));
  });
});
