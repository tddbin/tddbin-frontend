var path = require('path');

module.exports = {
  entry: {
    // Put all entry modules that are also required by another entry module into an array
    // see https://github.com/webpack/webpack/issues/300
//    'src-test-runner-mocha-runner': ['./src/test-runner/mocha/runner.js'],
    'src/test-runner/mocha/spec-runner': './src/test-runner/mocha/spec-runner.js',

    'examples/test-runner/mocha': './examples/test-runner/mocha.js',
    'examples/editor': './examples/editor.js',
    'examples/tddbin-standalone': './examples/tddbin-standalone.js',
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
