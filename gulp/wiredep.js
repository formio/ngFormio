module.exports = function(gulp, plugins) {
  return function () {
    var wiredep = require('wiredep').stream;
    gulp.src('src/styles/*.scss')
      .pipe(wiredep({
        ignorePath: /^(\.\.\/)+/
      }))
      .pipe(gulp.dest('src/styles'));

    gulp.src('src/*.html')
      .pipe(plugins.inject(gulp.src([
        'scripts/**/*.js',
        'styles/**/*.css'
      ], {
        read: false,
        cwd: 'src/'
      }),
        { relative: true}))
      .pipe(wiredep({
        exclude: ['bootstrap-sass-official', 'bower_components/bootstrap/'],
        ignorePath: /^(\.\.\/)*\.\./
      }))
      .pipe(gulp.dest('src'));
  };
};
