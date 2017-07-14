module.exports = (ctx) => ({
  plugins: [
    require('autoprefixer')({ browsers: 'last 2 versions' })
  ]
});
