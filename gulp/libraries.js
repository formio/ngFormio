module.exports = function(gulp, plugins) {
  return function () {
    var stream = require('merge-stream')();
    stream.add(gulp.src('src/lib/**/*').pipe(gulp.dest('dist/lib')));
    stream.add(gulp.src('bower_components/seamless/build/*').pipe(gulp.dest('dist/lib/seamless')));
    stream.add(gulp.src('bower_components/seamless/build/*').pipe(gulp.dest('.tmp/lib/seamless')));
    return stream;
  };
};
