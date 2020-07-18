const WebpackConfig = require('./webpack.config');
const merge = require('webpack-merge').merge;
module.exports = merge(WebpackConfig, {
  mode: 'development'
});
