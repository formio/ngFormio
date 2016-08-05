module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('src/views/**/*.html')
      .pipe(plugins.debug({title: 'views:'}))
      .pipe(gulp.dest('dist/views'));
  };
};
