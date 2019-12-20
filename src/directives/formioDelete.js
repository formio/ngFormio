import { Formio } from 'formiojs';
const app = angular.module('formio');
export default app.directive('formioDelete', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=?',
      submission: '=?',
      src: '=?',
      formAction: '=?',
      resourceName: '=?',
      message: '=?',
      options: '=?'
    },
    template: `<form role="form">
        <div ng-repeat="alert in formioAlerts track by $index" class="alert alert-{{ alert.type }}" role="alert">
          {{ alert.message | formioTranslate:null:options.building }}
        </div>
        <h3>{{ deleteMessage | formioTranslate:null:options.building }}</h3>
        <div class="btn-toolbar">
          <button ng-click="onDelete()" class="btn btn-danger">{{ 'Yes' | formioTranslate:null:options.building }}</button>
          <button ng-click="onCancel()" class="btn btn-default">{{ 'No' | formioTranslate:null:options.building }}</button>
        </div>
      </form>`,
    controller: [
      '$scope',
      '$element',
      '$http',
      'FormioScope',
      function(
        $scope,
        $element,
        $http,
        FormioScope
      ) {
        $scope.options = $scope.options || {};
        $scope.formioAlerts = [];
        $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };
        var resourceName = '';
        var methodName = '';
        $scope.$watch('src', (src) => {
          if (!src) { return; }
          $scope.formio = new Formio(src);
          resourceName = $scope.formio.submissionId ? 'submission' : 'form';
          var resourceTitle = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
          methodName = 'delete' + resourceTitle;
          $scope.deleteMessage = $scope.message || 'Are you sure you wish to delete the ' + resourceName + '?';
        });

        $scope.$watch('resourceName', (name) => {
          if (!name) { return; }
          resourceName = name;
        });

        $scope.$watch('formAction', function (action) {
          if (!action) { return; }

          $scope.action = action;
          $scope.deleteMessage = $scope.message || 'Are you sure you wish to delete the ' + resourceName + '?';
        });

        // Create delete capability.
        $scope.onDelete = function() {
          resourceName = resourceName || 'resource';
          // Rebuild resourceTitle, $scope.resourceName could have changed
          var resourceTitle = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
          // Called when the delete is done.
          var onDeleteDone = function(data) {
            $scope.showAlerts({
              type: 'success',
              message: resourceTitle + ' was deleted.'
            });
            Formio.clearCache();
            $scope.$emit('delete', data);
          };

          if ($scope.action) {
            $http.delete($scope.action).then(onDeleteDone, FormioScope.onError($scope, $element));
          }
          else if ($scope.formio) {
            if (!methodName) return;
            if (typeof $scope.formio[methodName] !== 'function') return;
            $scope.formio[methodName]().then(onDeleteDone, FormioScope.onError($scope, $element));
          }
        };
        $scope.onCancel = function() {
          $scope.$emit('cancel');
        };
      }
    ]
  };
});
