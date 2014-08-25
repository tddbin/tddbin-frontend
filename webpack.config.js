var path = require('path');

module.exports = {
  entry: {
    // Put all entry modules that are also required by another entry module into an array
    // see https://github.com/webpack/webpack/issues/300
    'mocha-runner': ['./src/test-runner/mocha/runner.js'],

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
