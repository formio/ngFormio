module.exports = function(gulp, plugins) {
  return function () {
    var stream = require('merge-stream')();

    stream.add(gulp.src('src/*.html')
      .pipe(plugins.useref({searchPath: ['.tmp', 'src', '.']}))
      .pipe(plugins.debug({title: 'html:'}))
      .pipe(plugins.if('**/app.js', plugins.uglify()))
      .pipe(plugins.if('**/plugins.js', plugins.uglify()))
      .pipe(plugins.if('*.css', plugins.csso()))
      .pipe(plugins.if('*.html', plugins.minifyHtml({conditionals: true, loose: true})))
      .pipe(gulp.dest('dist')));

    stream.add(gulp.src('src/config.js')
      .pipe(plugins.replace('serverHost = host;', 'serverHost = \'localhost:3000\';'))
      .pipe(gulp.dest('.tmp')));

    return stream;
  };
};
