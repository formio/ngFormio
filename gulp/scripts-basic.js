module.exports = function(gulp, plugins, bundle) {
  return function() {
    bundle = bundle || plugins.browserify({
      entries: './src/formio.js',
      debug: false,
      standalone: 'formio',
      ignoreMissing: true
    });

    return bundle
      .bundle()
      .pipe(plugins.source('formio.js'))
      .pipe(plugins.wrap(plugins.template, {version: plugins.packageJson.version}))
      .pipe(plugins.derequire())
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio.min.js'))
      .pipe(plugins.streamify(plugins.uglify({output: {comments: '/^!/'}})))
      .pipe(gulp.dest('dist/'))
      .on('error', function(err){
        console.log(err);
        this.emit('end');
      });
  };
};
