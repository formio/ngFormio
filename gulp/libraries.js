module.exports = function(gulp, plugins) {
  return function () {
    var stream = require('merge-stream')();
    stream.add(gulp.src('src/lib/**/*').pipe(gulp.dest('dist/lib')));
    stream.add(gulp.src('node_modules/seamless/build/**/*').pipe(gulp.dest('dist/lib/seamless')));
    stream.add(gulp.src('node_modules/ckeditor/**/*').pipe(gulp.dest('dist/lib/ckeditor')));
    return stream;
  };
};
