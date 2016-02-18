'use strict';

module.exports = function(gulp, plugins) {
  var b = plugins.watchify(
    plugins.browserify({
      entries: './src/formio.js',
      debug: false
    })
  );

  var bundle = function() {
    console.log('writing: dist/formio.js and dist/formio.min.js');

    return b
      .bundle()
      .pipe(plugins.source('formio.js'))
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist/'))
      .on('error', function(err) {
        console.log(err);
        this.emit('end');
      });
  };

  b.on('update', bundle);
  return bundle;
};
