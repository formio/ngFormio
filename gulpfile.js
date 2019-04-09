const gulp = require('gulp');
const s3 = require("gulp-s3");
gulp.task('deploy:alpha', function () {
  var settings = require('../aws.json');
  settings.bucket = 'alpha.form.io';
  settings.region = 'us-west-2';
  return gulp.src(['./dist/**/*', '!./dist/lib/**/*']).pipe(s3(settings));
});

gulp.task('deploy:beta', function () {
  var settings = require('../aws.json');
  settings.bucket = 'beta.form.io';
  settings.region = 'us-west-2';
  return gulp.src(['./dist/**/*', '!./dist/lib/**/*']).pipe(s3(settings));
});
