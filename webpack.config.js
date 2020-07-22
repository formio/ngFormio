const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/scripts.js',
  performance: { hints: false },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts.js',
  },
  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "styles.css",
      chunkFilename: "[id].css"
    }),
    new CopyWebpackPlugin([
      {from: 'src/index.html'},
      {from: 'src/externalModules.js'},
      {from: 'node_modules/ckeditor', to: 'lib/ckeditor', toType: 'dir'},
      {from: 'node_modules/formio-tenant/dist', to: 'tenant', toType: 'dir'},
      {from: 'node_modules/formmanager/dist', to: 'manager', toType: 'dir'},
      {from: 'src/images/favicons/manifest.json', to: 'images/favicons', toType: 'dir'}
    ]),
    new webpack.ProvidePlugin({
      "window.jQuery": "jquery",
      "jQuery": "jquery",
      "$": "jquery",
      "ckeditor": 'CKEditor',
      "window.Formio": "Formio"
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          /node_modules/,
          /src\/config\.js$/,
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    useBuiltIns: 'usage',
                    targets: {
                      ie: '11',
                    },
                    corejs: 3
                  }
                ]
              ]
            }
          },
          {
            loader: 'angularjs-template-loader',
            options: {
              relativeTo: path.resolve(__dirname, 'src')
            }
          }
        ]
      },
      {
        test: /\.(woff2?|ttf|eot|otf)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts'
            }
          }
        ]
      },
      {
        test: /\.(xml|svg|gif|png|jpe?g|ico)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[path][name].[ext]',
              context: './src'
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // you can specify a publicPath here
              // by default it use publicPath in webpackOptions.output
              // publicPath: '../'
            }
          },
          'css-loader?-url',
          'sass-loader',
        ]
      },
      {
        test: /robots\.txt$/,
        use: ['file-loader?name=[name].[ext]']
      },
      {
        test: /config\.js$/,
        use: ['file-loader?name=[name].[ext]']
      },
      {
        test: /\.html/,
        exclude: /src\/index\.html$/,
        use: 'raw-loader'
      }
    ]
  },
  mode: 'development',
  // devtool: 'source-map',
  devServer: {
    disableHostCheck: true,
  },
  resolve: {
    symlinks: false
  }
};
