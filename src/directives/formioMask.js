var maskInput = require('vanilla-text-mask').default;
var createNumberMask = require('text-mask-addons').createNumberMask;
var formioUtils = require('formiojs/utils');

module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, controller) {
      var format = attrs.formioMask;
      var inputElement;

      if (element[0].tagName === 'INPUT') {
        // `textMask` directive is used directly on an input element
        inputElement = element[0];
      }
      else {
        // `textMask` directive is used on an abstracted input element
        inputElement = element[0].getElementsByTagName('INPUT')[0];
      }

      var getFormatOptions = function() {
        if (format === 'currency') {
          return {
            style: 'currency',
            currency: scope.currency,
            useGrouping: true,
            maximumFractionDigits: _.get(scope.component, 'decimalLimit', scope.decimalLimit)
          };
        }
        return {
          style: 'decimal',
          useGrouping: true,
          maximumFractionDigits: _.get(scope.component, 'decimalLimit', scope.decimalLimit)
        };
      };

      scope.decimalSeparator = scope.options.decimalSeparator = scope.options.decimalSeparator ||
        (12345.6789).toLocaleString(scope.options.language).match(/345(.*)67/)[1];
      scope.thousandsSeparator = scope.options.thousandsSeparator = scope.options.thousandsSeparator ||
        (12345.6789).toLocaleString(scope.options.language).match(/12(.*)345/)[1];

      if (format === 'currency') {
        scope.currency = scope.component.currency || 'USD';
        scope.decimalLimit = scope.component.decimalLimit || 2;

        // Get the prefix and suffix from the localized string.
        var regex = '(.*)?100(' + (scope.decimalSeparator === '.' ? '\.' : scope.decimalSeparator) + '0{' + scope.decimalLimit + '})?(.*)?';
        var parts = (100).toLocaleString(scope.options.language, getFormatOptions()).match(new RegExp(regex));
        scope.prefix = parts[1] || '';
        scope.suffix = parts[3] || '';
      }
      else if (format ==='number') {
        // Determine the decimal limit. Defaults to 20 but can be overridden by validate.step or decimalLimit settings.
        scope.decimalLimit = 20;
        if (
          scope.component.validate &&
          scope.component.validate.step &&
          scope.component.validate.step !== 'any'
        ) {
          var parts = scope.component.validate.step.toString().split('.');
          if (parts.length > 1) {
            scope.decimalLimit = parts[1].length;
          }
        }
      }

      /**
       * Sets the input mask for an input.
       * @param {HTMLElement} input - The html input to apply the mask to.
       */
      var setInputMask = function(input) {
        if (!input) {
          console.log('no input');
          return;
        }

        var mask;
        if (scope.component.inputMask) {
          // Text or other input mask, including number with inputMask.
          mask = formioUtils.getInputMask(scope.component.inputMask);
        }
        else if (format === 'currency') {
          // Currency mask.
          mask = createNumberMask({
            prefix: scope.prefix,
            suffix: scope.suffix,
            thousandsSeparatorSymbol: _.get(scope.component, 'thousandsSeparator', scope.thousandsSeparator),
            decimalSymbol: _.get(scope.component, 'decimalSymbol', scope.decimalSeparator),
            decimalLimit: _.get(scope.component, 'decimalLimit', scope.decimalLimit),
            allowNegative: _.get(scope.component, 'allowNegative', true),
            allowDecimal: _.get(scope.component, 'allowDecimal', true)
          });
        }
        else if (format === 'number') {
          // Numeric input mask.
          mask = createNumberMask({
            prefix: '',
            suffix: '',
            thousandsSeparatorSymbol: _.get(scope.component, 'thousandsSeparator', scope.thousandsSeparator),
            decimalSymbol: _.get(scope.component, 'decimalSymbol', scope.decimalSeparator),
            decimalLimit: _.get(scope.component, 'decimalLimit', scope.decimalLimit),
            allowNegative: _.get(scope.component, 'allowNegative', true),
            allowDecimal: _.get(scope.component, 'allowDecimal',
              !(scope.component.validate && scope.component.validate.integer))
          });
        }

        // Set the mask on the input element.
        if (mask) {
          scope.inputMask = mask;
          maskInput({
            inputElement: input,
            mask: mask,
            showMask: true,
            keepCharPositions: false,
            guide: true,
            placeholderChar: '_'
          });
        }
      };

      setInputMask(inputElement);

      controller.$validators.mask = function(modelValue, viewValue) {
        var input = modelValue || viewValue;
        if (input) {
          return formioUtils.matchInputMask(input, scope.inputMask);
        }

        return true;
      };

      // Only use for currency or number formats.
      if (format) {
        // Convert from view to model
        controller.$parsers.push(function(value) {
          if (!value) {
            return value;
          }

          // Strip out the prefix and suffix before parsing.
          value = value.replace(scope.prefix, '').replace(scope.suffix, '');

          // Remove thousands separators and convert decimal separator to dot.
          value = value.split(scope.thousandsSeparator).join('').replace(scope.decimalSeparator, '.');

          if (scope.component.validate && scope.component.validate.integer) {
            return parseInt(value, 10);
          }
          else {
            return parseFloat(value);
          }
        });

        // Convert from model to view
        controller.$formatters.push(function(value) {
          if (Array.isArray(value)) {
            value = value[0];
          }
          try {
            // Strip out the prefix and suffix. scope occurs when numbers are from an old renderer.
            value = value.replace(scope.prefix, '').replace(scope.suffix, '');
          }
          catch (e) {
            // If value doesn't have a replace method, continue on as before.
          }

          // If not a number, return empty string.
          if (isNaN(value)) {
            return '';
          }

          // If empty string, zero or other, don't format.
          if (!value) {
            return value;
          }

          if (scope.component.validate && scope.component.validate.integer) {
            return parseInt(value, 10).toLocaleString(scope.options.language, getFormatOptions());
          }
          else {
            return parseFloat(value).toLocaleString(scope.options.language, getFormatOptions());
          }
        });
      }
    }
  };
};
