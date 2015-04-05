module.exports = function(gulp, plugins) {
  return function () {
    plugins.browserSync({
      notify: false,
      port: 9000,
      server: {
        baseDir: ['.tmp', 'app'],
        routes: {
          '/bower_components': 'bower_components'
        }
      }
    });

    // watch for changes
    gulp.watch([
      'app/*.html',
      'app/scripts/**/*.js',
      'app/images/**/*',
      '.tmp/fonts/**/*'
    ]).on('change', plugins.browserSync.reload);
    gulp.watch('app/styles/**/*.scss', ['styles']);
    gulp.watch('app/fonts/**/*', ['fonts']);
    gulp.watch('bower.json', ['wiredep', 'fonts']);
    gulp.watch('bower_components/formio/**/*.js', ['build-formio']);
    gulp.watch('bower_components/ngFormBuilder/**/*.js', ['build-formbuilder']);
  };
};
