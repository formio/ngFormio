var gulp = require('gulp');
var concat = require('gulp-concat');
var stripDebug = require('gulp-strip-debug');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var jshint = require('gulp-jshint');
var wrapper = require('gulp-wrapper');
var rename = require('gulp-rename');

// The javascript sources.
var sources = [
  'formio.js',
  'components/components.js',
  'components/textfield.js',
  'components/*.js'
];

gulp.task('clean', require('del').bind(null, ['dist']));

gulp.task('watch', function () {
  gulp.watch(sources, ['jshint', 'scripts']);
});

gulp.task('jshint', function () {
  return gulp.src(sources)
    .pipe(jshint({
      predef: ['angular']
    }))
    .pipe(jshint.reporter('default'))
});

gulp.task('scripts', function () {
  return gulp.src(sources)
    .pipe(concat('formio.js'))
    .pipe(wrapper({
      header: "(function () {\n'use strict';\n",
      footer: '})();'
    }))
    .pipe(gulp.dest('dist/js/'))
    .pipe(rename('formio.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js/'));
});

gulp.task('build', ['clean', 'scripts']);
gulp.task('default', ['jshint', 'build', 'watch']);
