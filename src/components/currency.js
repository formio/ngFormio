var fs = require('fs');
var createNumberMask = require('text-mask-addons').createNumberMask;
var _get = require('lodash/get');
var _isNil = require('lodash/isNil');

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('currency', {
        title: 'Currency',
        template: 'formio/components/currency.html',
        group: 'advanced',
        tableView: function(data, options) {
          if (_isNil(data)) {
            return '';
          }

          var separators = options.util.getNumberSeparators();
          var component = options.component;
          var decimalLimit = component.decimalLimit || 2;
          var affixes = options.util.getCurrencyAffixes({
            decimalSeparator: separators.decimalSeparator,
            decimalLimit: decimalLimit,
            currency: component.currency
          });

          if (!component.delimiter) {
            separators.delimiter = '';
          }

          return options.util.formatNumber(data, createNumberMask({
            prefix: affixes.prefix,
            suffix: affixes.suffix,
            thousandsSeparatorSymbol: _get(component, 'thousandsSeparator', separators.delimiter),
            decimalSymbol: _get(component, 'decimalSymbol', separators.decimalSeparator),
            decimalLimit: decimalLimit,
            allowNegative: _get(component, 'allowNegative', true),
            allowDecimal: _get(component, 'allowDecimal', true)
          }));
        },
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'text',
          inputMask: '',
          label: 'Currency',
          key: 'currency',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          delimiter: true,
          decimalLimit: 2,
          requireDecimal: true,
          validate: {
            required: false,
            multiple: '',
            custom: ''
          },
          conditional: {
            show: null,
            when: null,
            eq: ''
          }
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/currency.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/currency.html', 'utf8')
      ));
    }
  ]);
};
