/*global -plugins */
'use strict';
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
plugins.browserSync = require('browser-sync');
gulp.task('styles', ['wiredep'], require('./gulp/styles')(gulp, plugins));
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
gulp.task('serve', ['wiredep', 'styles', 'fonts', 'libraries', 'watch']);
gulp.task('build', ['jshint', 'wiredep', 'html', 'views', 'images', 'libraries', 'fonts', 'extras'], function() {
  return gulp.src('dist/**/*').pipe(plugins.size({title: 'build', gzip: true}));
});

var s3 = require("gulp-s3");
gulp.task('deploy:beta', function () {
  var settings = require('../aws.json');
  settings.bucket = 'beta.form.io';
  settings.region = 'us-west-2';
  return gulp.src(['./dist/**/*', '!./dist/lib/**/*']).pipe(s3(settings));
});

gulp.task('deploy:beta:test', function () {
  var settings = require('../aws.json');
  settings.bucket = 'portal.test-form.io';
  settings.region = 'us-west-2';
  return gulp.src(['./dist/**/*', '!./dist/lib/**/*']).pipe(s3(settings, {
    uploadPath: '/beta/'
  }));
});

gulp.task('deploy:beta:prod', function () {
  var settings = require('../aws.json');
  settings.bucket = 'portal.form.io';
  settings.region = 'us-west-2';
  return gulp.src(['./dist/**/*', '!./dist/lib/**/*']).pipe(s3(settings, {
    uploadPath: '/beta/'
  }));
});

gulp.task('deploy:beta:develop', function () {
  var settings = require('../aws.json');
  settings.bucket = 'portal.develop-form.io';
  settings.region = 'us-west-2';
  return gulp.src(['./dist/**/*', '!./dist/lib/**/*']).pipe(s3(settings));
});

gulp.task('default', ['clean'], function() {
  gulp.start('build');
});
