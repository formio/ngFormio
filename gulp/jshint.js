module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('src/scripts/**/*.js')
      .pipe(plugins.browserSync.reload({stream: true, once: true}))
      .pipe(plugins.jshint({
        predef: ['angular', '_', 'window', 'console', 'FileReader', 'kendo', 'moment', '$'],
        globalstrict: true
      }))
      .pipe(plugins.jshint.reporter('jshint-stylish'))
      .pipe(plugins.if(!plugins.browserSync.active, plugins.jshint.reporter('fail')));
  };
};
