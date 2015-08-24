module.exports = function(gulp, plugins) {
  return function () {
    var bs = plugins.browserSync.create();

    bs.init({
      notify: false,
      startPath: '/app',
      port: 9002,
      files: {

      },
      server: {
        baseDir: ['.tmp', 'src'],
        routes: {
          '/bower_components': 'bower_components',
          '/': 'src/brochure'
        }
      }
    });

    // watch for changes
    gulp.watch([
      'src/app/**/*.html',
      'src/app/scripts/**/*.js',
      'src/app/images/**/*',
      '.tmp/fonts/**/*'
    ]).on('change', bs.reload);
    gulp.watch('src/app/styles/**/*.scss', ['styles']);
    gulp.watch('src/app/fonts/**/*', ['fonts']);
    gulp.watch('bower.json', ['wiredep', 'fonts']);
  };
};
