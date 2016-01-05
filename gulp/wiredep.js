module.exports = function(gulp, plugins) {
  return function () {
    var stream = require('merge-stream')();

    var wiredep = require('wiredep').stream;
    stream.add(gulp.src('src/styles/*.scss')
      .pipe(wiredep({
        ignorePath: /^(\.\.\/)+/
      }))
      .pipe(gulp.dest('src/styles')));

    stream.add(gulp.src('src/*.html')
      .pipe(plugins.inject(gulp.src([
        'scripts/**/*.js',
        'styles/**/*.css'
      ], {
        read: false,
        cwd: 'src/'
      }),
        { relative: true}))
      .pipe(wiredep({
        exclude: ['bootstrap-sass', 'bower_components/bootstrap/'],
        ignorePath: /^(\.\.\/)*\.\./
      }))
      .pipe(gulp.dest('src')));

    return stream;
  };
};
