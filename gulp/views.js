module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('src/views/**/*.html').pipe(gulp.dest('dist/views'));
  };
};
