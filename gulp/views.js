module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('app/views/**/*.html').pipe(gulp.dest('dist/views'));
  };
};
