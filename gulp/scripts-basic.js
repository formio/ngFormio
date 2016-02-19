module.exports = function(gulp, plugins, bundle) {
  return function() {
    bundle = bundle || plugins.browserify({
      entries: './src/formio.js',
      debug: false
    });

    return bundle
      .bundle()
      .pipe(plugins.source('formio.js'))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist/'))
      .on('error', function(err){
        console.log(err);
        this.emit('end');
      });
  };
};
