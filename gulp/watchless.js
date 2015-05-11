module.exports = function(gulp, plugins) {
  return function () {
    gulp.watch('src/brochure/assets/less/**/*.less', ['less']);
  };
};
