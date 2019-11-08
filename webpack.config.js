const path = require('path');

module.exports = {
  entry: path.join(path.resolve(__dirname, 'lib'), 'index.js'),
  output: {
    library: 'bootstrap3',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    filename: 'bootstrap3.js',
  },
  mode: 'production',
  performance: { hints: false },
};
