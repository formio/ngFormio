var fs = require('fs');
module.exports = function(app) {
  app.directive('datePartInput', function() {
    return {
      restrict: 'E',
      replace: true,
      require: 'ngModel',
      scope: {
        component: '=',
        componentId: '=',
        readOnly: '=',
        model: '=ngModel',
        gridRow: '=',
        gridCol: '='
      },
      template: '' +
      '<div class="dateSelect form">' +
      '  <div class="form-group col-xs-3" ng-if="component.dayFirst">' +
      '   <label for="{{componentId}}-day">{{ "Day" | formioTranslate }}</label>' +
      '   <input class="form-control" type="text" id="{{componentId}}-day" style="padding-right: 10px;" placeholder="{{component.fields.day.placeholder}}" />' +
      '  </div>' +
      '  <div class="form-group col-xs-4">' +
      '   <label for="{{componentId}}-month">{{ "Month" | formioTranslate }}</label>' +
      '   <select class="form-control" type="text" id="{{componentId}}-month">' +
      '     <option ng-repeat="month in months" value="$index">{{ month }}</option>' +
      '   </select>' +
      '  </div>' +
      '  <div class="form-group col-xs-3" ng-if="!component.dayFirst">' +
      '   <label for="{{componentId}}-day">{{ "Day" | formioTranslate }}</label>' +
      '   <input class="form-control" type="text" id="{{componentId}}-day" style="padding-right: 10px;" placeholder="{{component.fields.day.placeholder}}" />' +
      '  </div>' +
      '  <div class="form-group col-xs-5">' +
      '   <label for="{{componentId}}-year">{{ "Year" | formioTranslate }}</label>' +
      '   <input class="form-control" type="text" id="{{componentId}}-year" style="padding-right: 10px;" placeholder="{{component.fields.year.placeholder}}" />' +
      '  </div>' +
      '</div>',
      controller: ['$scope', function($scope) {
        //console.log();
        $scope.months = [$scope.component.fields.month.placeholder, 'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
      }],
      link: function(scope, elem, attrs, ngModel) {
        //console.log('link');
      }
    };
  });
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('day', {
        title: 'Day',
        template: 'formio/components/day.html',
        group: 'advanced',
        //controller: ['$scope', function($scope) {
        //}],
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'dayField',
          fields: {
            day: {
              type: 'text',
              placeholder: '',
              required: false
            },
            month: {
              type: 'select',
              placeholder: '',
              required: false
            },
            year: {
              type: 'text',
              placeholder: '',
              required: false
            }
          },
          dayFirst: false,
          protected: false,
          persistent: true,
          validate: {
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/day.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/day.html', 'utf8')
      ));
    }
  ]);
};
