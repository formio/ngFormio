module.exports = function(gulp, plugins) {
  return function() {
    return plugins.browserify({
      entries: './src/formio-complete.js',
      debug: false
    })
      .bundle()
      .pipe(plugins.source('formio-complete.js'))
      .pipe(plugins.wrap(plugins.template, {version: plugins.packageJson.version}, {variable: 'data'}))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio-complete.min.js'))
      .pipe(plugins.streamify(plugins.uglify({preserveComments: 'license'})))
      .pipe(gulp.dest('dist/'));
  };
};
