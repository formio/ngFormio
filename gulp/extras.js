module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src([
      'app/*.*',
      '!app/*.html'
    ], {
      dot: true
    }).pipe(gulp.dest('dist'));
  };
};
