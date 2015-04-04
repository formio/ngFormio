var gulp = require('gulp');
var concat = require('gulp-concat');
var stripDebug = require('gulp-strip-debug');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var jshint = require('gulp-jshint');
var sources = [
  'formio.js',
  './components/components.js',
  './components/textfield.js',
  './components/*.js'
];

gulp.task('watch', function() {
  gulp.watch(sources, ['jshint', 'scripts']);
});

gulp.task('jshint', function() {
  return gulp.src(sources)
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
});

gulp.task('scripts', function() {
  return gulp.src(sources)
    .pipe(concat('formio.js'))
    .pipe(gulp.dest('./dist/'))
});

gulp.task('default', ['jshint', 'scripts', 'watch']);
