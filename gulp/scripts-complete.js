module.exports = function(gulp, plugins) {
  return function() {
    return plugins.browserify({
      entries: './src/formio-complete.js',
      debug: false,
      standalone: 'formio',
      insertGlobalVars: {
        SignaturePad: function() {
          return 'require("signature_pad")';
        }
      }
    })
      .bundle()
      .pipe(plugins.source('formio-complete.js'))
      .pipe(plugins.wrap(plugins.template, {version: plugins.packageJson.version}))
      .pipe(plugins.derequire())
      .pipe(gulp.dest('dist/'))
      .pipe(plugins.rename('formio-complete.min.js'))
      .pipe(plugins.streamify(plugins.uglify({preserveComments: 'license'})))
      .pipe(gulp.dest('dist/'));
  };
};
