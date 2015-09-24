module.exports = function(gulp, plugins) {
  return function () {
    plugins.browserify({
      entries: './src/formio.js',
      debug: true
    })
      .bundle()
      .pipe(plugins.source('formio.js'))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist/'));
    return plugins.browserify('./src/formio-full.js')
      .bundle()
      .pipe(plugins.source('formio-full.js'))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio-full.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist/'));
  };
};
