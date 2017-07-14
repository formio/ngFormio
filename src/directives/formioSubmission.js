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
        $scope.isVisible = function(component, row) {
          return FormioUtils.isVisible(
            component,
            row,
            $scope.submission ? $scope.submission.data : null,
            $scope.ignore
          );
        };
      }
    ]
  };
};
