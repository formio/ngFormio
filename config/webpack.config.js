const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const path = require('path');
module.exports = {
  performance: { hints: false },
  entry: './lib/index.js',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'ng-formio.js',
    libraryTarget: 'umd',
    library: 'ngformio'
  },
  module: {},
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/, 
      contextRegExp: /moment$/
    })
  ],
  target: 'node',
  externals: [nodeExternals()],
  resolve: {
    symlinks: false
  }
};
