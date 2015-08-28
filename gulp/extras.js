module.exports = function(gulp, plugins) {
  return function () {
    gulp.src([
      'src/*.*',
      '!src/*.html'
    ], {
      dot: true
    }).pipe(gulp.dest('dist'));
  };
};
