module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('app/scripts/**/*.js')
      .pipe(plugins.browserSync.reload({stream: true, once: true}))
      .pipe(plugins.jshint({
        predef: ['angular']
      }))
      .pipe(plugins.jshint.reporter('jshint-stylish'))
      .pipe(plugins.if(!plugins.browserSync.active, plugins.jshint.reporter('fail')));
  };
};
