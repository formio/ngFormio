module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('src/app/views/**/*.html').pipe(gulp.dest('dist/app/views'));
  };
};
