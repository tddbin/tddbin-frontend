import {StackTrace} from './stack-trace.js';
import {LinePrefix} from './line-prefix.js';
import {MarkedLinePrefix} from './marked-line-prefix.js';

export class RuntimeError {
  static prettyPrint(dump, sourceCode){
    let stackTrace = new StackTrace(dump);
    let line = stackTrace.lineOfOrigin();
    let column = stackTrace.columnOfOrigin();

    var sourceLines = sourceCode.split('\n');
    var maxDigits = sourceLines.length.toString().length;
    var markedLines = sourceLines.map((sourceLine, idx) => {
      let lineNumber = idx + 1;
      if (lineNumber === line) {
        return MarkedLinePrefix.getPrefix(lineNumber, maxDigits) + sourceLine;
      }
      return LinePrefix.getPrefix(lineNumber, maxDigits) + sourceLine;
    });
    var neew = markedLines.splice(0, line);
    neew = neew.concat('      ^').concat(markedLines);
    return neew.join('\n');
  }
}
