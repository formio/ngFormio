const webpack = require('webpack');
const path = require('path');

const nodeExternals = require('webpack-node-externals');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const autoprefixer = require('autoprefixer');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ng-formio.js',
    libraryTarget: 'umd',
    library: 'ngformio'
  },
  module: {
    loaders: [
      {
        test: /\.json$/,
        loaders: [
          'json-loader'
        ]
      },
      //{
      //  test: /\.js$/,
      //  exclude: /node_modules/,
      //  loader: 'eslint-loader',
      //  enforce: 'pre'
      //},
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
        loader: ExtractTextPlugin.extract({ fallback: 'style-loader', use: ['css-loader', 'sass-loader', 'postcss-loader']})
      },
      {
        test: /\.(woff2?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: "file-loader?name=fonts/[name].[ext]"
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loaders: [
          'babel-loader'
        ]
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'window.jQuery': 'jquery',
      'moment': 'moment'
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    //new webpack.LoaderOptionsPlugin({
    //  options: {
    //    postcss: () => [autoprefixer]
    //  },
    //  debug: true
    //}),
    new ExtractTextPlugin('formio.css')
  ],
  //externals: [nodeExternals()],
  externals: {
    jquery: 'jQuery',
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
