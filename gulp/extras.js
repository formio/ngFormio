module.exports = function(gulp, plugins) {
  return function () {
    gulp.src([
      'src/brochure/**'
    ]).pipe(gulp.dest('dist/'));
    gulp.src([
      'src/start/html/**'
    ]).pipe(gulp.dest('dist/start'));
    gulp.src([
      'src/app/*.*',
      '!src/app/*.html'
    ], {
      dot: true
    }).pipe(gulp.dest('dist/app'));
    // The old system did all apps but we only have one and it shouldn't be here anyway so hard code for now.
    gulp.src([
      'src/apps/boardman/dist/**'
    ]).pipe(gulp.dest('dist/apps/boardman'));
  };
};
