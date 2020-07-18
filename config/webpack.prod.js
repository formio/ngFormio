const webpack = require('webpack');
const merge = require('webpack-merge').merge;
const packageJSON = require('../package.json');
module.exports = merge(require('./webpack.dev'), {
  mode: 'production',
  output: {
    filename: 'ng-formio.min.js'
  },
  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new webpack.BannerPlugin(`ng-formio v${packageJSON.version} | https://unpkg.com/ngFormio@${packageJSON.version}/LICENSE.txt`)
  ]
});
