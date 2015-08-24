module.exports = function(gulp, plugins) {
  return function () {
    gulp.src([
      'src/brochure/**/*'
    ]).pipe(gulp.dest('dist/'));
    gulp.src([
      'src/start/html/**/*'
    ]).pipe(gulp.dest('dist/start'));
    gulp.src([
      'src/app/*.*',
      '!src/app/*.html'
    ], {
      dot: true
    }).pipe(gulp.dest('dist/app'));
  };
};
