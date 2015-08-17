/*global -plugins */
'use strict';
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
plugins.browserSync = require('browser-sync');
gulp.task('styles', require('./gulp/styles')(gulp, plugins));
gulp.task('jshint', require('./gulp/jshint')(gulp, plugins));
gulp.task('html', ['styles'], require('./gulp/html')(gulp, plugins));
gulp.task('images', require('./gulp/images')(gulp, plugins));
gulp.task('libraries', require('./gulp/libraries')(gulp, plugins));
gulp.task('fonts', require('./gulp/fonts')(gulp, plugins));
gulp.task('extras', require('./gulp/extras')(gulp, plugins));
gulp.task('views', require('./gulp/views')(gulp, plugins));
gulp.task('img-cache', function(done) {
  plugins.cache.clearAll(done);
});
gulp.task('clean', ['img-cache'], require('del').bind(null, ['.tmp', 'dist']));
gulp.task('wiredep', require('./gulp/wiredep')(gulp, plugins));
gulp.task('watch', require('./gulp/watch')(gulp, plugins));
gulp.task('less', require('./gulp/less')(gulp, plugins));
gulp.task('watchless', require('./gulp/watchless')(gulp, plugins));
gulp.task('serve', ['wiredep', 'styles', 'fonts', 'watch']);
gulp.task('build', ['jshint', 'wiredep', 'html', 'views', 'images', 'libraries', 'fonts', 'extras'], function() {
  return gulp.src('dist/**/*').pipe(plugins.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean'], function() {
  gulp.start('build');
});
