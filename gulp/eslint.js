module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src(['src/**/*.js'])
      .pipe(plugins.eslint({
        rules: {
          'max-len': 0,
          'max-statements': 0
        }
      }))
      .pipe(plugins.eslint.format())
      .pipe(plugins.eslint.failAfterError());
  };
};
