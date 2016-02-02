module.exports = function(gulp, plugins) {
  return function() {
    return plugins.browserify({
      entries: './src/formio-full.js'
    })
      .bundle()
      .pipe(plugins.source('formio-full.js'))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio-full.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist/'));
  };
};
