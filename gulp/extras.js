module.exports = function(gulp, plugins) {
  return function () {
    gulp.src([
      'src/brochure/**/*'
    ]).pipe(gulp.dest('dist/'));
    gulp.src([
      'bower_components/**/*'
    ]).pipe(gulp.dest('dist/bower_components'));
    gulp.src([
      'src/app/*.*',
      '!src/app/*.html'
    ], {
      dot: true
    }).pipe(gulp.dest('dist/app'));
  };
};
