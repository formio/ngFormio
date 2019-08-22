const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const postcssPresetEnv = require('postcss-preset-env');
module.exports = {
  performance: { hints: false },
  entry: './lib/index.js',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'ng-formio.js',
    libraryTarget: 'umd',
    library: 'ngformio'
  },
  module: {
    rules: [
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader',
          options: {
            attrs: [':data-src']
          }
        }
      },
      {
        test: /\.(css|scss)$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            'css-loader',
            'sass-loader',
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: () => [
                  postcssPresetEnv()
                ]
              }
            }
          ]
        })
      },
      {
        test: /\.(woff2?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        exclude: /icons?\/|images?\/|imgs?\//,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'fonts/',
          }
        }]
      },
      {
        test: /icons?\/.*\.(gif|png|jpe?g|svg)$/i,
        exclude: /fonts?\//,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'icons/',
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'window.jQuery': 'jquery',
      'moment': 'moment'
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new ExtractTextPlugin('formio.css')
  ],
  externals: {
    jquery: 'jquery',
    angular: 'angular'
  },
  devtool: 'source-map',
  resolve: {
    symlinks: false
  },
  devServer: {
    historyApiFallback: true
  }
};
