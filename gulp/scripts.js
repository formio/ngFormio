module.exports = function(gulp, plugins) {
  return function () {
    plugins.browserify({
      entries: './src/formio.js',
      transform: ['strictify'],
      debug: true
    })
      .bundle()
      .pipe(plugins.source('formio.js'))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist/'));
    return plugins.browserify({
      entries: './src/formio-full.js',
      transform: ['strictify']
    })
      .bundle()
      .pipe(plugins.source('formio-full.js'))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio-full.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist/'));
  };
};
