module.exports = function(app) {
  app.config([
    'FormioPluginsProvider',
    'FormioStorageUrlProvider',
    function(
      FormioPluginsProvider,
      FormioStorageUrlProvider
    ) {
      FormioPluginsProvider.register('storage', 'url', FormioStorageUrlProvider.$get());
    }
  ]);

  app.factory('FormioStorageUrl', [
    '$q',
    'Upload',
    function(
      $q,
      Upload
    ) {
      return {
        title: 'Url',
        name: 'url',
        uploadFile: function(file, fileName, status, $scope) {
          var defer = $q.defer();
          Upload.upload({
            url: $scope.component.url,
            data: {
              file: file,
              name: fileName
            }
          })
            .then(function(resp) {
              defer.resolve(resp);
            }, function(resp) {
              defer.reject(resp.data);
            }, function(evt) {
              // Progress notify
              status.status = 'progress';
              status.progress = parseInt(100.0 * evt.loaded / evt.total);
              delete status.message;
            });
          return defer.promise;
        },
        downloadFile: function() {
          // Do nothing which will cause a normal link click to occur.
        }
      };
    }]
  );
};
