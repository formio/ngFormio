module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('app/lib/**/*')
      .pipe(gulp.dest('dist/lib'));
  };
};
