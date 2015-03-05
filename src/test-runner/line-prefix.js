export class LinePrefix {
  static getPrefix(lineNumber, maxDigits) {
    let leadingSpaces = getLeadingSpaces(lineNumber, maxDigits);
    return `${getSpaces(leadingSpaces)}${lineNumber} | `;
  }
}

const DEFAULT_LEADING_SPACE = 2;

const getLeadingSpaces = (number, maxDigits) => {
  var numberLength = number.toString().length;
  return DEFAULT_LEADING_SPACE + maxDigits - numberLength;
};

const getSpaces = (howMany) => {
  return new Array(howMany + 1).join(' ');
};
