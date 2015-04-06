module.exports = function(gulp, plugins) {
  return function () {
    return gulp.src('app/styles/**/*.scss')
      .pipe(plugins.sourcemaps.init())
      .pipe(plugins.sass({
        outputStyle: 'nested', // libsass doesn't support expanded yet
        precision: 10,
        includePaths: ['.'],
        onError: console.error.bind(console, 'Sass error:')
      }))
      .pipe(plugins.postcss([
        require('autoprefixer-core')({browsers: ['last 1 version']})
      ]))
      .pipe(plugins.sourcemaps.write())
      .pipe(gulp.dest('.tmp/styles'))
      .pipe(plugins.browserSync.reload({stream: true}));
  };
};
