var maskInput = require('vanilla-text-mask').default;
var createNumberMask = require('text-mask-addons').createNumberMask;
var formioUtils = require('formiojs/utils').default;
var _ = require('lodash');

module.exports = ['FormioUtils', function(FormioUtils) {
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

      var separators = FormioUtils.getNumberSeparators(scope.options.language);

      scope.decimalSeparator = scope.options.decimalSeparator = scope.options.decimalSeparator ||
        separators.decimalSeparator;

      if (scope.component.delimiter) {
        if (scope.options.hasOwnProperty('thousandsSeparator')) {
          console.warn("Property 'thousandsSeparator' is deprecated. Please use i18n to specify delimiter.");
        }

        scope.delimiter = scope.options.thousandsSeparator || separators.delimiter;
      }
      else {
        scope.delimiter = '';
      }

      // Allow override of decimalSeparator and delimiter in options.
      if (scope.options.languageOverride && scope.options.languageOverride.hasOwnProperty(scope.options.language || 'en')) {
        scope.decimalSeparator = scope.options.languageOverride[scope.options.language || 'en'].decimalSeparator;
        scope.delimiter = scope.options.languageOverride[scope.options.language || 'en'].delimiter;
      }

      if (format === 'currency') {
        scope.decimalLimit = scope.component.decimalLimit || 2;

        var affixes = FormioUtils.getCurrencyAffixes({
          decimalSeparator: scope.decimalSeparator,
          decimalLimit: scope.decimalLimit,
          currency: scope.component.currency,
          lang: scope.options.language
        });
        scope.prefix = affixes.prefix;
        scope.suffix = affixes.suffix;
      }
      else if (format ==='number') {
        scope.decimalLimit = FormioUtils.getNumberDecimalLimit(scope.component);
      }

      /**
       * Sets the input mask for an input.
       * @param {HTMLElement} input - The html input to apply the mask to.
       */
      var setInputMask = function(input) {
        if (!input) {
          console.warn('no input');
          return;
        }

        var maskOptions = {
          prefix: '',
          suffix: '',
          thousandsSeparatorSymbol: _.get(scope.component, 'thousandsSeparator', scope.delimiter),
          decimalSymbol: _.get(scope.component, 'decimalSymbol', scope.decimalSeparator),
          allowNegative: _.get(scope.component, 'allowNegative', true)
        };

        if (_.get(scope.component, 'decimalLimit', scope.decimalLimit) === 0 ||
          (scope.component.validate && scope.component.validate.integer) ||
          !_.get(scope.component, 'allowDecimal', true)
        ) {
          maskOptions.allowDecimal = false;
        }
        else {
          maskOptions.allowDecimal = true;
          maskOptions.decimalLimit = _.get(scope.component, 'decimalLimit', scope.decimalLimit);
          maskOptions.requireDecimal = _.get(scope.component, 'requireDecimal', scope.requireDecimal);
        }

        var mask;
        if (scope.component.inputMask) {
          // Text or other input mask, including number with inputMask.
          mask = formioUtils.getInputMask(scope.component.inputMask);
        }
        else if (format === 'currency') {
          maskOptions.prefix = scope.prefix;
          maskOptions.suffix = scope.suffix;
          // Currency mask.
          mask = createNumberMask(maskOptions);
        }
        else if (format === 'number') {
          // Numeric input mask.
          mask = createNumberMask(maskOptions);
        }
        else if (format === 'datetime') {
          mask = formioUtils.getInputMask((scope.component.format.replace(/[hHmMyYdD]/g, '9').replace(/[a]/g, 'P')));
          mask.forEach(function(item, index) {
            if (item === 'P') {
              mask[index] = /[AP]/;
              mask.splice(index + 1, 0, /[M]/);
            }
          });
        }

        // Set the mask on the input element.
        if (mask) {
          scope.inputMask = mask;
          maskInput({
            inputElement: input,
            mask: mask,
            showMask: (format !== 'number' && format !== 'currency' && format !== 'datetime'),
            keepCharPositions: false,
            guide: true,
            placeholderChar: '_'
          });
        }
      };

      setInputMask(inputElement);

      if (format !== 'datetime') {
        controller.$validators.mask = function(modelValue, viewValue) {
          var input = modelValue || viewValue;
          if (input) {
            return formioUtils.matchInputMask(input, scope.inputMask);
          }

          return true;
        };
      }

      switch (format) {
        case 'currency':
        case 'number':
          // Convert from view to model
          controller.$parsers.push(function(value) {
            if (!value) {
              return value;
            }

            // Strip out the prefix and suffix before parsing.
            value = value.replace(scope.prefix, '').replace(scope.suffix, '');

            // Remove thousands separators and convert decimal separator to dot.
            value = value.split(scope.delimiter).join('').replace(scope.decimalSeparator, '.');

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

            return FormioUtils.formatNumber(value, scope.inputMask);
          });
          break;
        case 'datetime':
          // Convert from view to model
          // controller.$parsers.push(function(value) {
          //   console.log('value', value);
          //   if (!value) {
          //     return value;
          //   }
          //
          //   return new Date(value);
          // });
          //
          // // Convert from model to view
          // controller.$formatters.push(function(value) {
          //   return value;
          // });
          break;
      }
    }
  };
}];
