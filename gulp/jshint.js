module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src(['src/**/*.js'])
      .pipe(plugins.jshint({
        predef: ['angular'],
        browserify: true,
        strict: false
      }))
      .pipe(plugins.jshint.reporter('default'));
  };
};
