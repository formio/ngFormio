module.exports = function(gulp, plugins) {
  return function () {
    plugins.nodemon({
      script: 'server.js',
      ext: 'html js',
      tasks: ['build']
    }).on('restart', function () {
      console.log('restarted!')
    });
  };
};
