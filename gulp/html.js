module.exports = function(gulp, plugins) {
  return function () {
    var stream = require('merge-stream')();
    var gutil = require('gulp-util');

    var assets = plugins.useref.assets({searchPath: ['.tmp', 'src', '.']});
    stream.add(gulp.src('src/*.html')
      .pipe(assets)
      .pipe(plugins.if('*.js', plugins.uglify().on('error', gutil.log)))
      .pipe(plugins.if('*.css', plugins.csso()))
      .pipe(assets.restore())
      .pipe(plugins.useref())
      .pipe(plugins.if('*.html', plugins.minifyHtml({conditionals: true, loose: true})))
      .pipe(gulp.dest('dist')));

    stream.add(gulp.src('src/config.js')
      .pipe(plugins.replace('var serverHost = host;', 'var serverHost = \'localhost:3000\';'))
      .pipe(gulp.dest('.tmp')));

    return stream;
  };
};
