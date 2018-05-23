const WebpackConfig = require('./webpack.config');
const merge = require('webpack-merge');
module.exports = merge(WebpackConfig, {
  mode: 'development'
});
