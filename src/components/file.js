var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('file', {
        title: 'File',
        template: 'formio/components/file.html',
        group: 'advanced',
        tableView: function(data, options) {
          if (!data || data.length === 0) {
            return '';
          }

          data = options.component.multiple ? data : data[0];
          return '<a href="' + data.url + '" target="_blank">' + data.originalName + '</a>';
        },
        settings: {
          autofocus: false,
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
          hidden: false,
          clearOnHide: true,
          filePattern: '*',
          fileMinSize: '0KB',
          fileMaxSize: '1GB'
        },
        controller: [
          '$scope',
          '$timeout',
          function(
            $scope,
            $timeout
          ) {
            if ($scope.options && $scope.options.building) return;
            if ($scope.component.autofocus) {
              $timeout(function() {
                angular.element('#' + $scope.component.key + '-browse')[0].focus();
              });
            }
          }
        ],
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
          if ($scope.options && $scope.options.building) return;
          $scope.removeFile = function(event, index) {
            var component = $scope.$parent.component;
            if (component.storage === 'url') {
              $scope.$parent.formio.makeRequest('', component.url + '/' + $scope.files[index].name, 'delete');
            }
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
          if ($scope.options && $scope.options.building) return;
          $scope.removeFile = function(event, index) {
            var component = $scope.$parent.component;
            if (component.storage === 'url') {
              $scope.$parent.formio.makeRequest('', component.url + '/' + $scope.files[index].name, 'delete');
            }
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
      template: '<a href="{{ file.url }}" ng-click="getFile($event)" target="_blank">{{ file.originalName || file.name }}</a>',
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
          if ($scope.options && $scope.options.building) return;
          $scope.getFile = function(evt) {
            evt.preventDefault();
            $scope.form = $scope.form || $rootScope.filePath;
            $scope.options = $scope.options || {};
            var baseUrl = Formio.setScopeBase($scope);
            var formio = new Formio($scope.form, {base: baseUrl});
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
      template: '<img ng-src="{{ file.imageSrc }}" alt="{{ file.originalName || file.name }}" ng-style="{width: width}" />',
      controller: [
        '$rootScope',
        '$scope',
        'Formio',
        function(
          $rootScope,
          $scope,
          Formio
        ) {
          if ($scope.options && $scope.options.building) return;
          $scope.form = $scope.form || $rootScope.filePath;
          $scope.options = $scope.options || {};
          var baseUrl = Formio.setScopeBase($scope);
          var formio = new Formio($scope.form, {base: baseUrl});
          formio.downloadFile($scope.file)
            .then(function(result) {
              $scope.file.imageSrc = result.url;
              $scope.$apply();
            });
        }
      ]
    };
  }]);

  app.controller('formioFileUpload', [
    '$scope',
    '$interpolate',
    'FormioUtils',
    function(
      $scope,
      $interpolate,
      FormioUtils
    ) {
      if ($scope.options && $scope.options.building) return;
      $scope.fileUploads = {};
      $scope.removeUpload = function(index) {
        delete $scope.fileUploads[index];
      };

      // Defaults for unlimited components
      if (!$scope.component.filePattern) {
        $scope.component.filePattern = '*';
      }
      if (!$scope.component.fileMinSize) {
        $scope.component.fileMinSize = '0KB';
      }
      if (!$scope.component.fileMaxSize) {
        $scope.component.fileMaxSize = '1GB';
      }

      $scope.$watch('data.' + $scope.component.key, function(value) {
        // For some reason required validation doesn't fire properly after removing an item from an array which results
        // in an empty array that is marked as valid. Fix by removing the empty array.
        // Check also if the component value is an array with an empty string: [""]
        var isEmptyArray = Array.isArray(value) && value.length === 0;
        var isArrayWithEmptyItem = Array.isArray(value) && value.length === 1 && !value[0];
        if (isEmptyArray || isArrayWithEmptyItem) {
          delete $scope.data[$scope.component.key];
        }
        // The file model is not getting dirty automatically
        var form = $scope.$parent[$scope.formName];
        var componentModel = form ? form[$scope.component.key] : null;
        if (componentModel) {
          componentModel.$validate();
          componentModel.$setDirty();
        }
      }, true);

      $scope.browseKeyPress = function($event) {
        if ($event.key === 'Enter') {
          angular.element('#' + $scope.component.key + '-browse').triggerHandler('click');
        }
      };

      $scope.invalidFiles = [];
      $scope.currentErrors = [];
      $scope.upload = function(files, invalidFiles) {
        if (invalidFiles.length) {
          angular.forEach(invalidFiles, function(fileError) {
            if (fileError.$error === 'pattern') {
              fileError.$error = 'custom';
              $scope.component.customError = 'File extension does not match the pattern ' + $scope.component.filePattern;
            }
            if (fileError.$error === 'maxSize') {
              fileError.$error = 'custom';
              $scope.component.customError = 'File size is larger than the allowed ' + $scope.component.fileMaxSize;
            }
            if (fileError.$error === 'minSize') {
              fileError.$error = 'custom';
              $scope.component.customError = 'File size is smaller than the allowed ' + $scope.component.fileMinSize;
            }

            $scope.currentErrors.push(fileError.$error);
            $scope.formioForm[$scope.componentId].$setValidity(fileError.$error, false);
            $scope.formioForm[$scope.componentId].$setDirty();
          });
          return;
        }
        else {
          angular.forEach($scope.currentErrors, function(err) {
            $scope.formioForm[$scope.componentId].$setValidity(err, true);
          });
          $scope.currentErrors = [];
        }

        if ($scope.component.storage && files && files.length) {
          angular.forEach(files, function(file) {
            // Get a unique name for this file to keep file collisions from occurring.
            var fileName = FormioUtils.uniqueName(file.name);
            $scope.fileUploads[fileName] = {
              originalName: file.name,
              name: fileName,
              size: file.size,
              status: 'info',
              message: 'Starting upload'
            };
            var dir = $scope.component.dir || '';
            dir = $interpolate(dir)({data: $scope.data, row: $scope.row});
            var formio = $scope.formio || new Formio();

            if (formio) {
              formio.uploadFile($scope.component.storage, file, fileName, dir, function processNotify(evt) {
                $scope.fileUploads[fileName].status = 'progress';
                $scope.fileUploads[fileName].progress = parseInt(100.0 * evt.loaded / evt.total);
                delete $scope.fileUploads[fileName].message;
                $scope.$apply();
              }, $scope.component.url)
                .then(function(fileInfo) {
                  // Attach the original file name back to the file info.
                  fileInfo.originalName = file.name;

                  delete $scope.fileUploads[fileName];
                  // This fixes new fields having an empty space in the array.
                  if ($scope.data && $scope.data[$scope.component.key] === '') {
                    $scope.data[$scope.component.key] = [];
                  }
                  if ($scope.data && $scope.data[$scope.component.key] === undefined) {
                    $scope.data[$scope.component.key] = [];
                  }
                  if (!$scope.data[$scope.component.key] || !($scope.data[$scope.component.key] instanceof Array)) {
                    $scope.data[$scope.component.key] = [];
                  }

                  $scope.data[$scope.component.key].push(fileInfo);
                  $scope.$apply();
                  $scope.$emit('fileUploaded', fileName, fileInfo);
                })
                .catch(function(response) {
                  $scope.fileUploads[fileName].status = 'error';
                  $scope.fileUploads[fileName].message = response.data;
                  delete $scope.fileUploads[fileName].progress;
                  $scope.$apply();
                  $scope.$emit('fileUploadFailed', fileName, response);
                });
            }
          });
        }
      };
    }
  ]);
  app.directive('validateItemsLength', function() {
    return {
      require: 'ngModel',
      link: function(scope, ele, attrs, ngModelCtrl) {
        ngModelCtrl.$validators.minItems = function(modelValue, viewValue) {
          var isValid = true;
          if (scope.component && scope.component.validate && !isNaN(scope.component.validate.minItems)) {
            if (Array.isArray(modelValue)) {
              isValid = modelValue.length >= scope.component.validate.minItems;
            } else {
              isValid = false;
            }
          }
          ngModelCtrl.$error.minItems = !isValid;
          return isValid;
        }
        ngModelCtrl.$validators.maxItems = function(modelValue, viewValue) {
          var isValid = true;
          if (scope.component && scope.component.validate && !isNaN(scope.component.validate.maxItems)) {
            if (Array.isArray(modelValue)) {
              isValid = modelValue.length <= scope.component.validate.maxItems;
            }
          }
          ngModelCtrl.$error.maxItems = !isValid;
          return isValid;
        }
      }
    };
  });
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
