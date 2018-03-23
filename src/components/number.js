var fs = require('fs');
var createNumberMask = require('text-mask-addons').createNumberMask;
var _get = require('lodash/get');
var _isNil = require('lodash/isNil');

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      var isNumeric = function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      };
      formioComponentsProvider.register('number', {
        title: 'Number',
        template: 'formio/components/number.html',
        tableView: function(data, options) {
          if (_isNil(data)) {
            return '';
          }

          var separators = options.util.getNumberSeparators();
          var component = options.component;
          var decimalLimit = options.util.getNumberDecimalLimit(component);

          if (!component.delimiter) {
            separators.delimiter = '';
          }

          return options.util.formatNumber(data, createNumberMask({
            prefix: '',
            suffix: '',
            thousandsSeparatorSymbol: _get(component, 'thousandsSeparator', separators.delimiter),
            decimalSymbol: _get(component, 'decimalSymbol', separators.decimalSeparator),
            decimalLimit: _get(component, 'decimalLimit', decimalLimit),
            allowNegative: _get(component, 'allowNegative', true),
            allowDecimal: _get(component, 'allowDecimal', !(component.validate && component.validate.integer))
          }));
        },
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'number',
          label: 'Number',
          key: 'number',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          validate: {
            required: false,
            min: '',
            max: '',
            step: 'any',
            integer: '',
            multiple: '',
            custom: ''
          }
        },
        controller: ['$scope', function($scope) {
          if ($scope.options && $scope.options.building) return; // FOR-71 - Skip parsing input data.

          // Ensure that values are numbers.
          if ($scope.data && $scope.data.hasOwnProperty($scope.component.key)) {
            if (Array.isArray($scope.data[$scope.component.key])) {
              $scope.data[$scope.component.key].forEach(function(value, index) {
                if (!isNumeric(value)) {
                  $scope.data[$scope.component.key][index] = parseFloat(value);
                }
              });
            }
            else if (!isNumeric($scope.data[$scope.component.key])) {
              $scope.data[$scope.component.key] = parseFloat($scope.data[$scope.component.key]);
            }
          }
        }]
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/number.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/number.html', 'utf8')
      ));
    }
  ]);
};
