module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('src/lib/**/*')
      .pipe(gulp.dest('dist/lib'));
  };
};
