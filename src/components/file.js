module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('file', {
        title: 'File',
        template: 'formio/components/file.html',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'file',
          placeholder: '',
          multiple: false,
          defaultValue: '',
          protected: false,
        }
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
        function ($scope) {
          $scope.removeFile = function (event, index) {
            event.preventDefault();
            $scope.files.splice(index, 1);
          };

          $scope.fileSize = function (a, b, c, d, e) {
            return (b = Math, c = b.log, d = 1024, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2) + ' ' + (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes');
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
        '$scope',
        'FormioPlugins',
        function (
          $scope,
          FormioPlugins
        ) {
          $scope.getFile = function (evt) {
            var plugin = FormioPlugins('storage', $scope.file.storage);
            if (plugin) {
              plugin.downloadFile(evt, $scope.file, $scope);
            }
          };
        }
      ]
    };
  }]);

  app.controller('formioFileUpload', [
    '$scope',
    'FormioPlugins',
    function(
      $scope,
      FormioPlugins
    ) {
      $scope.fileUploads = {};

      $scope.removeUpload = function(index) {
        delete $scope.fileUploads[index];
      };

      // This fixes new fields having an empty space in the array.
      if ($scope.data && $scope.data[$scope.component.key] === '') {
        $scope.data[$scope.component.key] = [];
      }
      if ($scope.data && $scope.data[$scope.component.key][0] === '') {
        $scope.data[$scope.component.key].splice(0, 1);
      }

      $scope.upload = function(files) {
        if ($scope.component.storage && files && files.length) {
          var plugin = FormioPlugins('storage', $scope.component.storage);
          angular.forEach(files, function(file) {
            if (plugin) {
              $scope.fileUploads[file.name] = {
                name: file.name,
                size: file.size,
                status: 'info',
                message: 'Starting upload'
              };
              plugin.uploadFile(file, $scope.fileUploads[file.name], $scope)
                .then(function(fileInfo) {
                  delete $scope.fileUploads[file.name];
                  fileInfo.storage = $scope.component.storage;
                  $scope.data[$scope.component.key].push(fileInfo);
                })
                .catch(function(message) {
                  $scope.fileUploads[file.name].status = 'error';
                  $scope.fileUploads[file.name].message = message;
                  delete $scope.fileUploads[file.name].progress;
                });
            }
            else {
              $scope.fileUploads[file.name] = {
                name: file.name,
                size: file.size,
                status: 'error',
                message: 'Storage plugin not found'
              };
            }
          });
        }
      };
    }
  ]);
  app.run([
    '$templateCache',
    function (
      $templateCache
    ) {

      $templateCache.put('formio/components/formio-file-list.html',
        '<table class="table table-striped table-bordered">' +
          '<thead>' +
            '<tr>' +
              '<td ng-if="!readOnly" style="width:1%;white-space:nowrap;"></td>' +
              '<th>File Name</th>' +
              '<th>Size</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr ng-repeat="file in files track by $index">' +
              '<td ng-if="!readOnly" style="width:1%;white-space:nowrap;"><a ng-if="!readOnly" href="#" ng-click="removeFile($event, $index)" style="padding: 2px 4px;" class="btn btn-sm btn-default"><span class="glyphicon glyphicon-remove"></span></a></td>' +
              '<td><formio-file file="file" form="form"></formio-file></td>' +
              '<td>{{ fileSize(file.size) }}</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>'
      );

      $templateCache.put('formio/components/file.html',
        '<label ng-if="component.label && !component.hideLabel" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>' +
        '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>' +
        '<div ng-controller="formioFileUpload">' +
          '<formio-file-list files="data[component.key]" form="formio.formUrl"></formio-file-list>' +
          '<div ng-if="!readOnly">' +
            '<div ngf-drop="upload($files)" class="fileSelector" ngf-drag-over-class="' + "'" + 'fileDragOver' + "'" + '" ngf-multiple="component.multiple"><span class="glyphicon glyphicon-cloud-upload"></span>Drop files to attach, or <a href="#" ngf-select="upload($files)" ngf-multiple="component.multiple">browse</a>.</div>' +
            '<div ng-if="!component.storage" class="alert alert-warning">No storage has been set for this field. File uploads are disabled until storage is set up.</div>' +
            '<div ngf-no-file-drop>File Drag/Drop is not supported for this browser</div>' +
          '</div>' +
          '<div ng-repeat="fileUpload in fileUploads track by $index" ng-class="{' + "'has-error'" + ': fileUpload.status === '+ "'error'" +'}" class="file">' +
            '<div class="row">' +
              '<div class="fileName control-label col-sm-10">{{ fileUpload.name }} <span ng-click="removeUpload(fileUpload.name)" class="glyphicon glyphicon-remove"></span></div>' +
              '<div class="fileSize control-label col-sm-2 text-right">{{ fileSize(fileUpload.size) }}</div>' +
            '</div>' +
            '<div class="row">' +
              '<div class="col-sm-12">' +
                '<span ng-if="fileUpload.status === ' + "'progress'" + '">' +
                  '<div class="progress">' +
                    '<div class="progress-bar" role="progressbar" aria-valuenow="{{fileUpload.progress}}" aria-valuemin="0" aria-valuemax="100" style="width:{{fileUpload.progress}}%">' +
                      '<span class="sr-only">{{fileUpload.progress}}% Complete</span>' +
                    '</div>' +
                  '</div>' +
                '</span>' +
                '<div ng-if="!fileUpload.status !== ' + "'progress'" + '" class="bg-{{ fileUpload.status }} control-label">{{ fileUpload.message }}</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }
  ]);
};
