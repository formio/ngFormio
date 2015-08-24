module.exports = function(gulp, plugins) {
  return function () {
    plugins.browserSync({
      notify: false,
      port: 9002,
      server: {
        baseDir: ['.tmp', 'src/app'],
        routes: {
          '/bower_components': 'bower_components'
        }
      }
    });

    // watch for changes
    gulp.watch([
      'src/app/**/*.html',
      'src/app/scripts/**/*.js',
      'src/app/images/**/*',
      '.tmp/fonts/**/*'
    ]).on('change', plugins.browserSync.reload);
    gulp.watch('src/app/styles/**/*.scss', ['styles']);
    gulp.watch('src/app/fonts/**/*', ['fonts']);
    gulp.watch('bower.json', ['wiredep', 'fonts']);
  };
};
