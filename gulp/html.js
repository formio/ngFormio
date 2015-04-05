module.exports = function(gulp, plugins) {
  return function () {
    var assets = plugins.useref.assets({searchPath: ['.tmp', 'app', '.']});
    return gulp.src('app/*.html')
      .pipe(assets)
      .pipe(plugins.if('*.js', plugins.uglify()))
      .pipe(plugins.if('*.css', plugins.csso()))
      .pipe(assets.restore())
      .pipe(plugins.useref())
      .pipe(plugins.if('*.html', plugins.minifyHtml({conditionals: true, loose: true})))
      .pipe(gulp.dest('dist'));
  };
};
