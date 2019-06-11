module.exports = (ctx) => ({
  plugins: [
    require('autoprefixer')({ overrideBrowserslist: 'last 2 versions' })
  ]
});
