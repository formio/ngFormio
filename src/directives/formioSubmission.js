module.exports = function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      form: '=',
      submission: '=',
      ignore: '=?'
    },
    templateUrl: 'formio/submission.html',
    controller: [
      '$scope',
      'FormioUtils',
      function(
        $scope,
        FormioUtils
      ) {
        $scope.isVisible = function(component, data) {
          return FormioUtils.isVisible(
            component,
            data,
            $scope.submission.data,
            $scope.ignore
          );
        };
      }
    ]
  };
};
