var path = require('path');
module.exports = function(gulp, plugins) {

  return function() {
    var bundle = plugins.browserify({
      entries: './src/formio.js',
      debug: true
    });

    bundle.transform({
      global: true
    }, 'uglifyify');

    var build = function() {
      return bundle
        .bundle()
        .pipe(plugins.source('formio.js'))
        .pipe(plugins.rename('formio.min.js'))
        .pipe(gulp.dest('dist/'))
        .on('error', function(err){
          console.log(err);
          this.emit('end');
        });
    };

    bundle = plugins.watchify(bundle);
    bundle.on('update', function(files) {
      console.log('Changed files: ', files.map(path.relative.bind(path, process.cwd())).join(', '));
      console.log('Rebuilding dist/formio.js...');
      build();
    });
    bundle.on('log', function(msg) {
      console.log(msg);
    });

    return build();
  };

};
