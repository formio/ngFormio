module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('./css/formio.css')
      .pipe(gulp.dest('dist'))
      .pipe(plugins.cssnano())
      .pipe(plugins.rename('formio.min.css'))
      .pipe(gulp.dest('dist'));
  };
};
