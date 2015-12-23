var path = require('path');
module.exports = function(gulp, plugins, watch) {

  return function() {
    var bundle = plugins.browserify({
      entries: './src/formio.js',
      debug: watch
    });

    var build = function() {
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

    if(watch) {
      bundle = plugins.watchify(bundle);
      bundle.on('update', function(files) {
        console.log('Changed files: ', files.map(path.relative.bind(path, process.cwd())).join(', '));
        console.log('Rebuilding dist/formio.js...');
        build();
      });
      bundle.on('log', function(msg) {
        console.log(msg);
      });
    }

    return build();
  };

};
