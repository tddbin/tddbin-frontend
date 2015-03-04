export class StackTrace {
  constructor(dump) {
    this.dump = dump;
  }
  lineOfOrigin() {
    var lineNumber = this.firstLineOfDump().split(':');
    return lineNumber[lineNumber.length - 2];
  }
  columnOfOrigin() {
    var lineNumber = this.firstLineOfDump().split(':');
    return parseInt(lineNumber[lineNumber.length - 1]);
  }
  firstLineOfDump() {
    // may look something like this:
    //    at eval (eval at consumeMessage (http://tddbin/dist/mocha/spec-runner.js:53280:10), <anonymous>:11:22)
    return this.dump.split('\n')[1];
  }
}
