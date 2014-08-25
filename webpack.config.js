var path = require('path');

module.exports = {
  entry: {
    'mocha-runner': './src/test-runner/mocha/runner.js',
    'examples-test-runner-mocha': './examples/test-runner/mocha.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'jsx-loader?harmony' }
    ]
  },
  resolve: {
    // you can now require('file') instead of require('file.js')
    extensions: ['', '.js', '.json']
  }
};
