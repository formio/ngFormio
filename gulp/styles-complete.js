module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src(plugins.bowerFiles({
        includeSelf: true
    }))
      .pipe(plugins.filter('**/*.css'))
      .pipe(plugins.concat('formio-complete.css'))
      .pipe(gulp.dest('dist'))
      .pipe(plugins.cssnano({zindex: false}))
      .pipe(plugins.rename('formio-complete.min.css'))
      .pipe(gulp.dest('dist'));
  };
};
