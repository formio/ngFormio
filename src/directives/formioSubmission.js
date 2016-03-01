module.exports = function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      form: '=',
      submission: '='
    },
    templateUrl: 'formio/submission.html'
  };
};
