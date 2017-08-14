import {StackTrace} from './stack-trace.js';
import {LinePrefix, MarkedLinePrefix} from './line-prefix.js';

const COLUMN_HIGHLIGHT_CHARACTER = '^';

export default class RuntimeError {
  static prettyPrint(dump, sourceCode) {
    const {line, column} = getLineAndColumnOfOriginFromDump(dump);

    const sourceLines = sourceCode.split('\n');
    const maxDigits = sourceLines.length.toString().length;
    const markedLines = sourceLines.map((sourceLine, idx) => {
      let lineNumber = idx + 1;
      if (lineNumber === line) {
        return MarkedLinePrefix.getPrefix(lineNumber, maxDigits) + sourceLine;
      }
      return LinePrefix.getPrefix(lineNumber, maxDigits) + sourceLine;
    });
    let neew = markedLines.splice(0, line);
    neew = neew.concat(getSpaces(7 + column - 1) + COLUMN_HIGHLIGHT_CHARACTER).concat(markedLines);
    return neew.join('\n');
  }
}

function getSpaces(howMany) {
  return new Array(howMany + 1).join(' ');
}

function getLineAndColumnOfOriginFromDump(dump) {
  const stackTrace = new StackTrace(dump);
  const line = stackTrace.lineOfOrigin();
  const column = stackTrace.columnOfOrigin();
  return {line, column};
}
