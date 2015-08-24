module.exports = function(gulp, plugins) {
  return function () {
    var wiredep = require('wiredep').stream;
    gulp.src('src/app/styles/*.scss')
      .pipe(wiredep({
        ignorePath: /^(\.\.\/)+/
      }))
      .pipe(gulp.dest('src/app/styles'));

    gulp.src('src/app/*.html')
      .pipe(plugins.inject(gulp.src([
        'scripts/**/*.js',
        'styles/**/*.css'
      ], {
        read: false,
        cwd: 'src/app/'
      }),
        { relative: true}))
      .pipe(wiredep({
        exclude: ['bootstrap-sass-official', 'bower_components/bootstrap/'],
        ignorePath: /^(\.\.\/)*\.\./
      }))
      .pipe(gulp.dest('src/app'));
  };
};
