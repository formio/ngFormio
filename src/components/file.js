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
  app.controller('formioFile', [
    '$scope',
    'Upload',
    'Formio',
    function(
      $scope,
      Upload,
      Formio
    ) {
      $scope.fileUploads = {};

      $scope.removeFile = function(index) {
        $scope.data[$scope.component.key].splice(index, 1);
      };

      // This fixes new fields having an empty space in the array.
      if ($scope.data[$scope.component.key][0] === '') {
        $scope.data[$scope.component.key].splice(0, 1);
      }

      $scope.upload = function(files) {
        if ($scope.component.storage && files && files.length) {
          switch($scope.component.storage) {
            case 's3':
              angular.forEach(files, function(file) {
                $scope.fileUploads[file.name] = {
                  name: file.name,
                  status: 'info',
                  message: 'Starting upload'
                };
                Formio.request($scope.formio.projectUrl + '/storage/s3', 'POST', {name: file.name, size: file.size, type: file.type})
                  .then(function(response) {
                    response.data.file = file;
                    var upload = Upload.upload(response);
                    upload
                      .then(function(resp) {
                        // Handle upload finished.
                        delete $scope.fileUploads[file.name];
                        $scope.data[$scope.component.key].push({
                          name: file.name,
                          bucket: response.data.bucket,
                          location: response.data.key
                        });
                      }, function(resp) {
                        // Handle error
                        var oParser = new DOMParser();
                        var oDOM = oParser.parseFromString(resp.data, 'text/xml');
                        $scope.fileUploads[file.name] = {
                          name: file.name,
                          status: 'error',
                          message: oDOM.getElementsByTagName('Message')[0].innerHTML
                        };
                      }, function(evt) {
                        // Progress notify
                        $scope.fileUploads[file.name] = {
                          name: file.name,
                          status: 'progress',
                          progress: parseInt(100.0 * evt.loaded / evt.total)
                        };
                        //console.log('progress: ' + parseInt(100.0 * evt.loaded / evt.total) + '% file :'+ evt.config.data.file.name);
                      });
                  });
              });
              break;
          }
        }
      };
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/file.html',
        '<label ng-if="component.label && !component.hideLabel" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>' +
        '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>' +
        '<div ng-controller="formioFile">' +
        '<div ng-repeat="file in data[component.key] track by $index">{{ file.name }} <span ng-if="!readOnly" ng-click="removeFile($index)"><span class="glyphicon glyphicon-remove-circle"></span></span></div>' +
        '<div ng-if="!readOnly">' +
          '<div ngf-drop="upload($files)" class="fileSelector" ngf-drag-over-class="' + "'" + 'fileDragOver' + "'" + '" ngf-multiple="component.multiple"><span class="glyphicon glyphicon-cloud-upload"></span>Drop files to attach, or <a href="#" ngf-select="upload($files)" ngf-multiple="component.multiple">browse</a>.</div>' +
          '<div ng-if="!component.storage" class="alert alert-warning">No storage has been set for this field. File uploads are disabled until storage is set up.</div>' +
          '<div ngf-no-file-drop>File Drag/Drop is not supported for this browser</div>' +
        '</div>' +
        '<div ng-repeat="fileUpload in fileUploads track by $index" ng-class="{' + "'has-error'" + ': fileUpload.status === '+ "'error'" +'}">' +
          '<div>{{ fileUpload.name }}</div>' +
          '<span ng-if="fileUpload.status === ' + "'progress'" + '">' +
            '<div class="progress">' +
              '<div class="progress-bar" role="progressbar" aria-valuenow="{{fileUpload.progress}}" aria-valuemin="0" aria-valuemax="100" style="width:{{fileUpload.progress}}%">' +
                '<span class="sr-only">{{fileUpload.progress}}% Complete</span>' +
              '</div>' +
            '</div>' +
          '</span>' +
          '<span ng-if="!fileUpload.status !== ' + "'progress'" + '" class="bg-{{ fileUpload.status }} help-block">' +
            '{{ fileUpload.message }}' +
          '</span>' +
        '</div>' +
      '</div>'
      );
    }
  ]);
};
