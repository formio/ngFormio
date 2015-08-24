module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('src/app/lib/**/*')
      .pipe(gulp.dest('dist/app/lib'));
  };
};
