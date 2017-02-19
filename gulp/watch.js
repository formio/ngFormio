module.exports = function(gulp, plugins) {
  return function () {
    var bs = plugins.browserSync.create();

    bs.init({
      notify: false,
      port: 9002,
      server: {
        baseDir: ['.tmp', 'src'],
        routes: {
          "/bower_components": "bower_components",
          "/lib/seamless": "node_modules/seamless/build",
          "/lib/ckeditor": "node_modules/ckeditor"
        }
      },
      ghostMode: false
    });

    // watch for changes
    gulp.watch([
      'src/**/*.html',
      'src/scripts/**/*.js',
      'src/images/**/*',
      '.tmp/fonts/**/*'
    ]).on('change', bs.reload);
    gulp.watch('src/styles/**/*.scss', ['styles']);
    gulp.watch('src/fonts/**/*', ['fonts']);
    gulp.watch('bower.json', ['wiredep', 'fonts']);
  };
};
