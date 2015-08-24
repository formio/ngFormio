module.exports = function(gulp, plugins) {
  return function () {
    var assets = plugins.useref.assets({searchPath: ['.tmp', 'src/app', '.']});
    gulp.src('src/app/*.html')
      .pipe(assets)
      .pipe(plugins.if('*.js', plugins.uglify()))
      .pipe(plugins.if('*.css', plugins.csso()))
      .pipe(assets.restore())
      .pipe(plugins.useref())
      .pipe(plugins.if('*.html', plugins.minifyHtml({conditionals: true, loose: true})))
      .pipe(gulp.dest('dist/app'));
    gulp.src('src/app/config.js')
      .pipe(plugins.replace('var serverHost = host;', 'var serverHost = \'localhost:3000\';'))
      .pipe(gulp.dest('.tmp/app'));
  };
};
