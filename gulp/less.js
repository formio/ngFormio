module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('src/brochure/assets/less/**/*.less')
      .pipe(plugins.less())
      .pipe(gulp.dest('src/brochure/assets/css'));
  };
};