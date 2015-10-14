module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src([
      'src/*.*',
      '!src/*.html'
    ], {
      dot: true
    }).pipe(gulp.dest('dist'));
  };
};
