var fs = require('fs');

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('survey', {
        title: 'Survey',
        template: 'formio/components/survey.html',
        group: 'advanced',
        tableView: function(data, component) {
          var view = '<table class="table table-striped table-bordered"><thead>';
          var values = {};
          angular.forEach(component.values, function(v) {
            values[v.value] = v.label;
          });
          angular.forEach(component.questions, function(question) {
            view += '<tr>';
            view += '<th>' + question.label + '</th>';
            view += '<td>' + values[data[question.value]] + '</td>';
            view += '</tr>';
          });
          view += '</tbody></table>';
          return view;
        },
        controller: ['$scope', '$timeout', function($scope, $timeout) {
          // FOR-71
          if ($scope.builder) return;
          // @todo: Figure out why the survey values are not defaulting correctly.
          var reset = false;
          $scope.$watch('data.' + $scope.component.key, function(value) {
            if (value && !reset) {
              reset = true;
              $scope.data[$scope.component.key] = {};
              $timeout((function(value) {
                return function() {
                  $scope.data[$scope.component.key] = value;
                  $timeout($scope.$apply.bind($scope));
                };
              })(value));
            }
          });
        }],
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'survey',
          questions: [],
          values: [],
          defaultValue: '',
          protected: false,
          persistent: true,
          clearOnHide: true,
          validate: {
            required: false,
            custom: '',
            customPrivate: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/survey.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/survey.html', 'utf8')
      ));
    }
  ]);
};
