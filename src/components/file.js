var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('file', {
        title: 'File',
        template: 'formio/components/file.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'file',
          image: false,
          imageSize: '200',
          placeholder: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          persistent: true,
          clearOnHide: true
        },
        viewTemplate: 'formio/componentsView/file.html'
      });
    }
  ]);

  app.directive('formioFileList', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        files: '=',
        form: '=',
        readOnly: '='
      },
      templateUrl: 'formio/components/formio-file-list.html',
      controller: [
        '$scope',
        function($scope) {
          if ($scope.builder) return;
          $scope.removeFile = function(event, index) {
            event.preventDefault();
            $scope.files.splice(index, 1);
          };

          $scope.fileSize = function(a, b, c, d, e) {
            return (b = Math, c = b.log, d = 1024, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2) + ' ' + (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes');
          };
        }
      ]
    };
  }]);

  app.directive('formioImageList', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        files: '=',
        form: '=',
        width: '=',
        readOnly: '='
      },
      templateUrl: 'formio/components/formio-image-list.html',
      controller: [
        '$scope',
        function($scope) {
          if ($scope.builder) return;
          $scope.removeFile = function(event, index) {
            event.preventDefault();
            $scope.files.splice(index, 1);
          };
        }
      ]
    };
  }]);

  app.directive('formioFile', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        file: '=',
        form: '='
      },
      template: '<a href="{{ file.url }}" ng-click="getFile($event)" target="_blank">{{ file.name }}</a>',
      controller: [
        '$window',
        '$rootScope',
        '$scope',
        'Formio',
        function(
          $window,
          $rootScope,
          $scope,
          Formio
        ) {
          if ($scope.builder) return;
          $scope.getFile = function(evt) {
            evt.preventDefault();
            $scope.form = $scope.form || $rootScope.filePath;
            var formio = new Formio($scope.form);
            formio
              .downloadFile($scope.file).then(function(file) {
                if (file) {
                  $window.open(file.url, '_blank');
                }
              })
              .catch(function(response) {
                // Is alert the best way to do this?
                // User is expecting an immediate notification due to attempting to download a file.
                alert(response);
              });
          };
        }
      ]
    };
  }]);

  app.directive('formioImage', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        file: '=',
        form: '=',
        width: '='
      },
      template: '<img ng-src="{{ imageSrc }}" alt="{{ file.name }}" ng-style="{width: width}" />',
      controller: [
        '$rootScope',
        '$scope',
        'Formio',
        function(
          $rootScope,
          $scope,
          Formio
        ) {
          if ($scope.builder) return;
          $scope.form = $scope.form || $rootScope.filePath;
          var formio = new Formio($scope.form);
          formio.downloadFile($scope.file)
            .then(function(result) {
              $scope.imageSrc = result.url;
              $scope.$apply();
            });
        }
      ]
    };
  }]);

  app.controller('formioFileUpload', [
    '$scope',
    'FormioUtils',
    function(
      $scope,
      FormioUtils
    ) {
      if ($scope.builder) return;
      $scope.fileUploads = {};
      $scope.removeUpload = function(index) {
        delete $scope.fileUploads[index];
      };

      // This fixes new fields having an empty space in the array.
      if ($scope.data && $scope.data[$scope.component.key] === '') {
        $scope.data[$scope.component.key] = [];
      }
      if ($scope.data && $scope.data[$scope.component.key] && $scope.data[$scope.component.key][0] === '') {
        $scope.data[$scope.component.key].splice(0, 1);
      }

      $scope.upload = function(files) {
        if ($scope.component.storage && files && files.length) {
          angular.forEach(files, function(file) {
            // Get a unique name for this file to keep file collisions from occurring.
            var fileName = FormioUtils.uniqueName(file.name);
            $scope.fileUploads[fileName] = {
              name: fileName,
              size: file.size,
              status: 'info',
              message: 'Starting upload'
            };
            var dir = $scope.component.dir || '';
            var formio = null;
            if ($scope.formio) {
              formio = $scope.formio;
            }
            else {
              $scope.fileUploads[fileName].status = 'error';
              $scope.fileUploads[fileName].message = 'File Upload URL not provided.';
            }

            if (formio) {
              formio.uploadFile($scope.component.storage, file, fileName, dir, function processNotify(evt) {
                $scope.fileUploads[fileName].status = 'progress';
                $scope.fileUploads[fileName].progress = parseInt(100.0 * evt.loaded / evt.total);
                delete $scope.fileUploads[fileName].message;
                $scope.$apply();
              }, $scope.component.url)
                .then(function(fileInfo) {
                  delete $scope.fileUploads[fileName];
                  // Ensure that the file component is an array.
                  if (
                    !$scope.data[$scope.component.key] ||
                    !($scope.data[$scope.component.key] instanceof Array)
                  ) {
                    $scope.data[$scope.component.key] = [];
                  }
                  $scope.data[$scope.component.key].push(fileInfo);
                  $scope.$apply();
                })
                .catch(function(response) {
                  $scope.fileUploads[fileName].status = 'error';
                  $scope.fileUploads[fileName].message = response.data;
                  delete $scope.fileUploads[fileName].progress;
                  $scope.$apply();
                });
            }
          });
        }
      };
    }
  ]);
  app.run([
    '$templateCache',
    function(
      $templateCache
    ) {
      $templateCache.put('formio/components/formio-image-list.html',
        fs.readFileSync(__dirname + '/../templates/components/formio-image-list.html', 'utf8')
      );

      $templateCache.put('formio/components/formio-file-list.html',
        fs.readFileSync(__dirname + '/../templates/components/formio-file-list.html', 'utf8')
      );

      $templateCache.put('formio/components/file.html',
        fs.readFileSync(__dirname + '/../templates/components/file.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/file.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/file.html', 'utf8')
      );
    }
  ]);
};
