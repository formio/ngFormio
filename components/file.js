app.constant('AMAZON_S3', {
  publicAccessKey: 'AKIAJTNEPGLXAIYPOYYA',
  bucket: 'formio-files',
  endpoint: '/storage/s3'
});

app.directive('formioFileInput', function(){
  return {
    require: 'ngModel',
    restrict: 'E',
    scope: true,
    replace: true,
    template:
      '<div class="input-group">' +
        '<span class="input-group-btn">' +
          '<span class="btn btn-primary" ' +
            'style="position: relative; overflow: hidden;">' +
            '<input type="file" ' +
              'style="position: absolute; top: 0; right: 0; min-width: 100%; min-height: 100%; font-size: 100px; text-align: right; filter: alpha(opacity=0); opacity: 0; outline: none; background: white; cursor: inherit; display: block;" ' +
              'id="{{ component.key }}" ' +
              // Angular doesn't support ng-change on files
              'onchange="angular.element(this).scope().fileChanged(this)"' +
              '/>' +
              '<i class="glyphicon glyphicon-folder-open"></i> &nbsp;Browse…' +
          '</span>' +
          '<button class="btn btn-default" ng-show="fileInput.value" ng-click="removeFile()"><i class="glyphicon glyphicon-remove-circle"></i> Cancel</button>' +
        '</span>' +
        '<input type="text" class="form-control" value="{{ fileInput.files[0].name || fileInput.value  }}" readonly placeholder="Select a file…" ng-if="!uploading"/>' +
        '<div class="progress" ng-if="uploading" style="height: 39px; margin-bottom: 0;">' +
          '<div class="progress-bar progress-bar-striped active" role="progressbar" ng-style="{ \'width\': uploadedPercent }" style="padding-top: 5px;">' +
            '{{ uploadedPercent }}' +
          '</div>' +
        '</div>' +
      '</div>',

    controller: ['$scope', '$timeout', 'FormioS3FileUploader', 'AMAZON_S3', function($scope, $timeout, FormioS3FileUploader, AMAZON_S3) {
      $scope.uploading = false;

      $scope.fileChanged = function(inputElem) {
        // Return to the angular world
        $scope.$apply(function(){
          $scope.fileInput = inputElem;

          // Skip empty inputs
          if(inputElem.value === '') {
            return;
          }

          $scope.uploader = FormioS3FileUploader.create({
            formId: $scope.formio.formId,
            componentKey: $scope.component.key,
            // TODO: allow customization of file limitations
            minSizeLimit: $scope.component.validate.minSizeLimit,
            maxSizeLimit: $scope.component.validate.maxSizeLimit,
            allowedExtensions: $scope.component.validate.allowedExtensions || [],
            onComplete: function(id, name, responseJSON) {
              $scope.uploading = false;
              // If not successful, don't update value
              if(!responseJSON.success) {
                return;
              }
              // Replace the form field with the uploaded URL
              var url = 'http://' + AMAZON_S3.bucket + '.s3.amazonaws.com/' + $scope.uploader.getKey(id);
              // Trigger event to update model in link function
              $scope.$broadcast('fileChanged', url);
            },
            onError: function(id, name, errorReason) {
              // This may or may not run during a digest.
              // Cannot use $apply while already in a digest, but $timeout will run it next digest.
              $timeout(function() {
                $scope.fileInput = null;
              });
              $scope.$broadcast('error', errorReason);
            },
            onCancel: function() {
              $scope.uploading = false;
              $scope.$broadcast('fileChanged', '');
            },
            onUploadStart: function() {
              $scope.uploading = true;
              $scope.uploadedPercent = '0%';
              $scope.$broadcast('uploadStart');
            },
            onProgress: function(id, name, uploadedBytes, totalBytes) {
              $scope.$apply(function() {
                $scope.uploadedBytes = uploadedBytes;
                $scope.totalBytes = totalBytes;
                $scope.uploadedPercent = (uploadedBytes / totalBytes * 100).toFixed(0) + '%';
              });
              
            }
          });
          $scope.uploader.addFiles(inputElem);

          
        });
      };

      $scope.removeFile = function() {
        // TODO: delete file from S3 if already uploaded
        if($scope.uploader) {
          $scope.uploader.cancelAll();
          $scope.uploader = null;
        }
        if($scope.fileInput) {
          $scope.fileInput = null;
        }
        // Trigger event to update model in link function
        $scope.$broadcast('fileChanged', '');
      };
    }],
    link: function($scope, elem, attrs, ngModel) {
      // ngRequire doesn't support files, so this is necessary to make required file inputs work.
      ngModel.$isEmpty = function(value) {
        return !value;
      };
      var updateValue = function(value) {
        console.log('updateValue', value);
        ngModel.$setViewValue(value);
        ngModel.$setDirty();  
        ngModel.$render();
      };
      $scope.$on('uploadStart', function() {
        ngModel.$setValidity('uploading', false);
      });
      $scope.$on('fileChanged', function(e, value) {
        ngModel.$setValidity('uploading', true);
        if(value !== '') {
          $scope.component.customError = '';
          ngModel.$setValidity('custom', true);
        }
        updateValue(value);
      });
      $scope.$on('error', function(e, message) {
        $scope.component.customError = message;
        ngModel.$setValidity('custom', false);
        updateValue('');
      });
      // updateValue('');
    }
  };
});

app.factory('FormioS3FileUploader', ['Formio', 'formioInterceptor', 'AMAZON_S3', function(Formio, formioInterceptor, AMAZON_S3) {
  /**
   * Creates a Fine-Uploader uploader with given options
   * @param opts
   * @returns {qq.s3.FineUploaderBasic}
   */
  var create = function(opts) {
    var uploader = new qq.s3.FineUploaderBasic({
      debug: true,
      autoUpload: true,
      cors: {
        expected: true
      },
      chunking: {
        enabled: false
      },
      validation: {
        minSizeLimit: opts.minSizeLimit,
        sizeLimit: opts.maxSizeLimit,
        allowedExtensions: opts.allowedExtensions
      },
      request: {
        endpoint: AMAZON_S3.bucket + '.s3.amazonaws.com',
        accessKey: AMAZON_S3.publicAccessKey
      },
      // deleteFile: {
      //   endpoint: Formio.baseUrl + AMAZON_S3.endpoint,
      //   customHeaders: {
      //    'x-jwt-token': formioInterceptor.getToken()
      //   }
      // },
      signature: {
        endpoint: Formio.baseUrl + AMAZON_S3.endpoint,
        customHeaders: {
         'x-jwt-token': formioInterceptor.getToken(),
         'x-formio-form-id': opts.formId,
         'x-formio-component-key': opts.componentKey
        }
      },
      callbacks: {
        onComplete: opts.onComplete,
        onError: opts.onError,
        onCancel: opts.onCancel,
        onUpload: opts.onUploadStart,
        onProgress: opts.onProgress,
      }
    });
    return uploader;
  };

  return {create: create};
}]);

app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('file', {
      title: 'File Upload',
      template: 'formio/components/file.html',
      settings: {
        input: true,
        label: '',
        key: '',
        placeholder: '',
        multiple: false,
        protected: false,
        persistent: true,
        validate: {
          required: false,
          minSizeLimit: '0',
          maxSizeLimit: '10000000'
        }
      }
    });
  }
]);
app.run([
  '$templateCache',
  'FormioUtils',
  function(
    $templateCache,
    FormioUtils
  ) {
    $templateCache.put('formio/components/file.html', FormioUtils.fieldWrap(
      '<formio-file-input component="component" name="{{ component.key }}" ng-model="data[component.key]" ng-required="component.validate.required"></formio-file-input>'
    ));
  }
]);
