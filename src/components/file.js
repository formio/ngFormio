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
    '$window',
    'Upload',
    'Formio',
    function(
      $scope,
      $window,
      Upload,
      Formio
    ) {
      $scope.fileUploads = {};

      $scope.removeFile = function(index) {
        $scope.data[$scope.component.key].splice(index, 1);
      };

      $scope.removeUpload = function(index) {
        console.log(index);
        delete $scope.fileUploads[index];
      };

      // This fixes new fields having an empty space in the array.
      if ($scope.data && $scope.data[$scope.component.key] === '') {
        $scope.data[$scope.component.key] = [];
      }
      if ($scope.data && $scope.data[$scope.component.key][0] === '') {
        $scope.data[$scope.component.key].splice(0, 1);
      }

      $scope.fileSize = function(a,b,c,d,e){
        return (b=Math,c=b.log,d=1024,e=c(a)/c(d)|0,a/b.pow(d,e)).toFixed(2)+' '+(e?'kMGTPEZY'[--e]+'B':'Bytes');
      };

      $scope.getFile = function(evt, file) {
        // If this is not a public file, get a signed url and open in new tab.
        if (file.acl !== 'public-read') {
          evt.preventDefault();
          Formio.request($scope.formio.formUrl + '/storage/s3?bucket=' + file.bucket + '&key=' + file.key, 'GET')
            .then(function(response) {
              $window.open(response.url, '_blank');
            })
            .catch(function(response) {
              // Is alert the best way to do this? User is expecting an immediate notification due to attempting to download a file.
              alert(response);
            });
        }
      };

      $scope.upload = function(files) {
        if ($scope.component.storage && files && files.length) {
          switch($scope.component.storage) {
            case 's3':
              angular.forEach(files, function(file) {
                $scope.fileUploads[file.name] = {
                  name: file.name,
                  size: file.size,
                  status: 'info',
                  message: 'Starting upload'
                };
                Formio.request($scope.formio.formUrl + '/storage/s3', 'POST', {name: file.name, size: file.size, type: file.type})
                  .then(function(response) {
                    var request = {
                      url: response.url,
                      method: 'POST',
                      data: response.data
                    };
                    request.data.file = file;
                    var dir = $scope.component.dir || '';
                    request.data.key += dir + file.name;
                    var upload = Upload.upload(request);
                    upload
                      .then(function(resp) {
                        // Handle upload finished.
                        delete $scope.fileUploads[file.name];
                        $scope.data[$scope.component.key].push({
                          name: file.name,
                          storage: 's3',
                          bucket: response.bucket,
                          key: request.data.key,
                          url: response.url + request.data.key,
                          acl: request.data.acl,
                          size: file.size,
                          type: file.type
                        });
                      }, function(resp) {
                        // Handle error
                        var oParser = new DOMParser();
                        var oDOM = oParser.parseFromString(resp.data, 'text/xml');
                        $scope.fileUploads[file.name].status = 'error';
                        $scope.fileUploads[file.name].message = oDOM.getElementsByTagName('Message')[0].innerHTML;
                        delete $scope.fileUploads[file.name].progress;
                      }, function(evt) {
                        // Progress notify
                        $scope.fileUploads[file.name].status = 'progress';
                        $scope.fileUploads[file.name].progress = parseInt(100.0 * evt.loaded / evt.total);
                        delete $scope.fileUploads[file.name].message;
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
        '<div ng-repeat="file in data[component.key] track by $index" class="file">' +
        ' <div class="row">' +
        '   <div class="fileName control-label col-sm-10"><a href="{{ file.url }}" ng-click="getFile($event, file)" target="_blank">{{ file.name }}</a> <span ng-if="!readOnly" ng-click="removeFile($index)"class="glyphicon glyphicon-remove"></span></div>' +
        '   <div class="fileSize control-label col-sm-2 text-right">{{ fileSize(file.size) }}</div>' +
        ' </div>' +
        '</div>' +
        '<div ng-if="!readOnly">' +
        ' <div ngf-drop="upload($files)" class="fileSelector" ngf-drag-over-class="' + "'" + 'fileDragOver' + "'" + '" ngf-multiple="component.multiple"><span class="glyphicon glyphicon-cloud-upload"></span>Drop files to attach, or <a href="#" ngf-select="upload($files)" ngf-multiple="component.multiple">browse</a>.</div>' +
        ' <div ng-if="!component.storage" class="alert alert-warning">No storage has been set for this field. File uploads are disabled until storage is set up.</div>' +
        ' <div ngf-no-file-drop>File Drag/Drop is not supported for this browser</div>' +
        '</div>' +
        '<div ng-repeat="fileUpload in fileUploads track by $index" ng-class="{' + "'has-error'" + ': fileUpload.status === '+ "'error'" +'}" class="file">' +
        ' <div class="row">' +
        '   <div class="fileName control-label col-sm-10">{{ fileUpload.name }} <span ng-click="removeUpload(fileUpload.name)" class="glyphicon glyphicon-remove"></span></div>' +
        '   <div class="fileSize control-label col-sm-2 text-right">{{ fileSize(fileUpload.size) }}</div>' +
        ' </div>' +
        ' <div class="row">' +
        '   <div class="col-sm-12">' +
        '   <span ng-if="fileUpload.status === ' + "'progress'" + '">' +
        '     <div class="progress">' +
        '       <div class="progress-bar" role="progressbar" aria-valuenow="{{fileUpload.progress}}" aria-valuemin="0" aria-valuemax="100" style="width:{{fileUpload.progress}}%">' +
        '         <span class="sr-only">{{fileUpload.progress}}% Complete</span>' +
        '       </div>' +
        '     </div>' +
        '   </span>' +
        '   <div ng-if="!fileUpload.status !== ' + "'progress'" + '" class="bg-{{ fileUpload.status }} control-label">' +
        '     {{ fileUpload.message }} ' +
        '   </div>' +
        '   </div>' +
        ' </div>' +
        '</div>' +
      '</div>'
      );
    }
  ]);
};
