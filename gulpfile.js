'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
plugins.source = require('vinyl-source-stream');
plugins.browserify = require('browserify');
plugins.watchify = require('watchify');
plugins.runSeq = require('run-sequence');
plugins.bowerFiles = require('main-bower-files');
plugins.addsrc = require('gulp-add-src');
plugins.packageJson = require('./package.json');

var template = '/*! ng-formio v<%= version %> | https://unpkg.com/ng-formio@<%= version %>/LICENSE.txt */';
template += "\n";
template += '<%= contents %>';
plugins.template = template;

gulp.task('clean', require('del').bind(null, ['dist']));
gulp.task('eslint', require('./gulp/eslint')(gulp, plugins));
gulp.task('styles', require('./gulp/styles')(gulp, plugins));
gulp.task('script', require('./gulp/scripts')(gulp, plugins));
gulp.task('build', function(cb) {
  plugins.runSeq(['clean', 'eslint'], 'scripts', 'styles', cb)
});
gulp.task('watch', require('./gulp/watch')(gulp, plugins));
gulp.task('default', ['watch']);
