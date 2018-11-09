var formioUtils = require('formiojs/utils').default;
var conformToMask = require('vanilla-text-mask').conformToMask;
var _filter = require('lodash/filter');
var _get = require('lodash/get');

module.exports = function() {
  var hooks = {};

  function optionsLabelOnTheTopOrBottom(position) {
    return [
      'top',
      'bottom'
    ].indexOf(position) !== -1;
  }

  return {
    // Asynchronously iterate through a map.
    each: function(items, each, done) {
      var index = -1;
      var arrayItems = [];
      for (var i in items) {
        arrayItems.push(items[i]);
      }

      (function next(err, previous) {
        if (err) {
          if (typeof err === 'string') {
            err = {alerts: {type: 'danger', message: '{"data": "' + err + '"}'}};
          }
          err.item = previous;
          return done ? done(err) : null;
        }
        index++;
        var item = arrayItems[index];
        if (!item) {
          return done ? done() : null;
        }
        each(item, function(err) {
          next(err, item);
        });
      })();
    },
    hook: function(name, cb) {
      var parts = name.split(':');
      var key = parts[0];
      name = (parts.length > 1) ? parts[1] : key;

      if (!hooks[name]) {
        hooks[name] = {};
      }
      hooks[name][key] = cb;
    },
    alter: function() {
      var name = arguments[0];
      var fn = (typeof arguments[arguments.length - 1] === 'function') ? arguments[arguments.length - 1] : null;
      var args = Array.prototype.slice.call(arguments, 1, (arguments.length - 1));
      if (hooks && hooks[name]) {
        this.each(hooks[name], function(hook, next) {
          hook.apply(this, args.concat([next]));
        }, fn);
      }
      else {
        // If this is an async hook instead of a sync.
        if (fn) {
          return fn(null, arguments[1]);
        }
        else {
          return arguments[1];
        }
      }
    },
    pluckItems: function(defaultItems, searchItems) {
      var temp = [];
      if (!defaultItems || !defaultItems.length) {
        return temp;
      }
      if (typeof defaultItems === 'string') {
        defaultItems = [defaultItems];
      }

      defaultItems.forEach(function(item) {
        var parts = item.split(':');
        if (parts.length === 2) {
          var result = _filter(searchItems, function(potential) {
            if (_get(potential, parts[0]) === parts[1]) {
              return true;
            }
          });

          if (result) {
            temp = temp.concat(result);
          }
        }
      });

      return temp;
    },
    checkDefaultValue: function(component, submission, data, $scope, done) {
      /* eslint-disable max-depth */
      var value = '';
      if (!done) {
        done = function(added) {
          return added;
        };
      }

      // Use the current data or default.
      if (data.hasOwnProperty(component.key)) {
        if (!component.multiple) {
          return done(false);
        }

        // If the value is an array then we are good.
        if (Array.isArray(data[component.key])) {
          return done(false);
        }

        // Split the value based on CSV
        data[component.key] = data[component.key].split(',');
        return done(true);
      }
      else if (component.customDefaultValue) {
        if (typeof component.customDefaultValue === 'string') {
          try {
            value = eval('(function(data) { var value = "";' + component.customDefaultValue + '; return value; })(data)');
          }
          catch (e) {
            /* eslint-disable no-console */
            console.warn('An error occurrend in a custom default value in ' + component.key, e);
            /* eslint-enable no-console */
            value = '';
          }
        }
        else {
          try {
            value = formioUtils.jsonLogic.apply(component.customDefaultValue, {
              data: submission ? submission.data : data,
              row: data
            });
          }
          catch (e) {
            /* eslint-disable no-console */
            console.warn('An error occurred calculating a value for ' + component.key, e);
            /* eslint-enable no-console */
            value = '';
          }
        }
        data[component.key] = component.multiple ? [value] : value;
        return done(true);
      }
      else if (component.hasOwnProperty('defaultValue')) {
        // FA-835 - The default values for select boxes are set in the component.
        if (component.type === 'selectboxes') {
          return done(false);
        }
        // If there is a default value and it is not an array, wrap the value.
        if (component.multiple && component.type !== 'file' && typeof component.defaultValue === 'string') {
          value = component.defaultValue.split(',');
        }
        else {
          value = component.defaultValue;
        }

        // If no default is provided, then skip...
        if (!value || !value.length) {
          return done(false);
        }

        // FOR-193 - Fix default value for the number component.
        // FOR-262 - Fix multiple default value for the number component.
        if (component.type === 'number') {
          if (!component.multiple) {
            // FOR-290 - Fix default values for number components, to allow decimal numbers.
            if (component.defaultValue.indexOf('.') !== -1) {
              data[component.key] = parseFloat(component.defaultValue);
              return done(true);
            }

            data[component.key] = parseInt(component.defaultValue);
            return done(true);
          }

          data[component.key] = value.map(function(item) {
            try {
              // FOR-290 - Fix default values for number components, to allow decimal numbers.
              if (item.indexOf('.') !== -1) {
                return parseFloat(item);
              }

              return parseInt(item);
            }
            catch (e) {
              return 0;
            }
          });
          return done(true);
        }
        // FOR-135 - Add default values for select components.
        else if (component.type === 'select') {
          // FOR-337 - Fix default values for select components without multi enabled.
          if (!component.multiple) {
            data[component.key] = component.defaultValue;
            return done(true);
          }

          // If using the values input, split the default values, and search the options for each value in the list.
          if (component.dataSrc === 'values') {
            var temp = [];

            component.data.values.forEach(function(item) {
              if (value.indexOf(item.value) !== -1) {
                temp.push(item.value);
              }
            });

            data[component.key] = temp;
            return done(true);
          }
          // If using json input, split the values and search each key path for the item
          else if (component.dataSrc === 'json') {
            if (typeof component.data.json === 'string') {
              try {
                component.data.json = JSON.parse(component.data.json);
              }
              catch (e) {
                /* eslint-disable no-console */
                console.log(e);
                console.log('Could not parse the given JSON for the select component: ' + component.key);
                console.log(component.data.json);
                /* eslint-enable no-console */
                component.data.json = [];
              }
            }

            data[component.key] = this.pluckItems(value, component.data.json);
            return done(true);
          }
          else if (component.dataSrc === 'url' || component.dataSrc === 'resource') {
            // Wait until loading is done.
            $scope.$on('selectLoaded', function() {
              data[component.key] = this.pluckItems(value, $scope.selectItems);
              return done(true);
            }.bind(this));
          }
        }
        // FOR-504 - Fix default values for survey components.
        else if (component.type === 'survey') {
          if (!component.hasOwnProperty('defaultValue')) {
            return done(false);
          }

          data[component.key] = data[component.key] || {};
          this.each(component.questions, function(question, next) {
            setTimeout(function() {
              data[component.key][question.value] = data[component.key][question.value] || component.defaultValue;
              return next();
            }, 1);
          }, function() {
            done(true);
          });
        }
        // FOR-949 - Default value for componenets with input mask.
        else if (component.inputMask) {
          var inputMask = formioUtils.getInputMask(component.inputMask);
          var self = this;
          if (component.multiple) {
            value = value.map(function(item) {
              return self.verifyMaskedInput(item, inputMask);
            });
          }
          else {
            value = this.verifyMaskedInput(value, inputMask);
          }
          data[component.key] = value;
          return done(true);
        }
        else {
          if (!component.multiple) {
            data[component.key] = component.defaultValue;
            return done(true);
          }

          // If there is a default value and it is an array, assign it to the value.
          if (Array.isArray(component.defaultValue)) {
            data[component.key] = component.defaultValue;
            return done(true);
          }

          // Make the defaultValue a single element array because were multi.
          data[component.key] = [component.defaultValue];
          return done(true);
        }
      }
      /* eslint-enable max-depth */
    },
    verifyMaskedInput: function(input, mask) {
      input = conformToMask(input, mask).conformedValue;
      if (!formioUtils.matchInputMask(input, mask)) {
        return '';
      }
      return input;
    },
    getNumberSeparators: formioUtils.getNumberSeparators,
    getNumberDecimalLimit: formioUtils.getNumberDecimalLimit,
    getCurrencyAffixes: formioUtils.getCurrencyAffixes,
    formatNumber: function(number, mask) {
      number = (number || 0).toString();
      return conformToMask(number, mask(number).filter(function(item) {
        return item !== '[]';
      })).conformedValue;
    },
    fieldData: formioUtils.fieldData,
    parseFloat: formioUtils.parseFloat,
    formatAsCurrency: formioUtils.formatAsCurrency,
    checkCalculated: formioUtils.checkCalculated,
    escapeRegExCharacters: formioUtils.escapeRegExCharacters,
    checkVisible: function(component, row, data) {
      var visible = formioUtils.checkCondition(component, row, data);
      if (!visible) {
        if (!component.hasOwnProperty('clearOnHide') || component.clearOnHide.toString() === 'true') {
          if (row && row.hasOwnProperty(component.key)) {
            delete row[component.key];
          }
          if (data && data.hasOwnProperty(component.key)) {
            delete data[component.key];
          }
        }
        return false;
      }
      return true;
    },
    isVisible: function(component, row, data, hide) {
      // If the component is in the hideComponents array, then hide it by default.
      if (hide && Array.isArray(hide) && (hide.indexOf(component.key) !== -1)) {
        return false;
      }

      return this.checkVisible(component, row, data);
    },
    flattenComponents: formioUtils.flattenComponents,
    eachComponent: formioUtils.eachComponent,
    getComponent: formioUtils.getComponent,
    getValue: formioUtils.getValue,
    jsonLogic: formioUtils.jsonLogic,
    hasCondition: formioUtils.hasCondition,
    getDateSetting: formioUtils.getDateSetting,
    hideFields: function(form, components) {
      this.eachComponent(form.components, function(component) {
        for (var i in components) {
          if (component.key === components[i]) {
            component.type = 'hidden';
          }
        }
      });
    },
    uniqueName: function(name) {
      var parts = name.toLowerCase().replace(/[^0-9a-z\.]/g, '').split('.');
      var fileName = parts[0];
      var ext = '';
      if (parts.length > 1) {
        ext = '.' + parts[(parts.length - 1)];
      }
      return fileName.substr(0, 10) + '-' + this.guid() + ext;
    },
    guid: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    },
    fieldWrap: function(input) {
      var multiInput = input.replace('data[component.key]', 'data[component.key][$index]');
      var inputTopLabel = '<label ng-if="labelVisible() && (component.labelPosition !== \'bottom\')" for="{{ component.key }}"  id="{{ component.key+\'Label\' }}" class="control-label" ng-class="{\'field-required\': isRequired(component)}" ng-style="getLabelStyles(component)">' +
        '{{ component.label | formioTranslate:null:options.building }} ' +
        '<formio-component-tooltip></formio-component-tooltip>' +
        '</label>';
      var inputBottomLabel = '<label ng-if="labelVisible() && (component.labelPosition === \'bottom\')" id="{{ component.key+\'Label\' }}" for="{{ component.key }}" class="control-label control-label--bottom" ng-class="{\'field-required\': isRequired(component)}">' +
        '{{ component.label | formioTranslate:null:options.building }} ' +
        '<formio-component-tooltip></formio-component-tooltip>' +
        '</label>';
      var requiredInline = '<span ng-if="(component.hideLabel === true || component.label === \'\' || !component.label) && isRequired(component)" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>';
      var template =
        '<div ng-if="!component.multiple">' +
          inputTopLabel +
          '<div class="input-group" ng-style="getInputGroupStyles(component)">' +
            '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
            input +
            requiredInline +
            '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
          '</div>' +
          inputBottomLabel +
          '<div class="formio-errors">' +
            '<formio-errors ng-if="::!options.building"></formio-errors>' +
          '</div>' +
        '</div>' +
        '<div ng-if="component.multiple">' +
          inputTopLabel +
          '<table class="table table-bordered" ng-style="getInputGroupStyles(component)">' +
            '<tr ng-repeat="value in data[component.key] track by $index">' +
              '<td>' +
                '<div class="input-group">' +
                  '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
                    multiInput +
                    requiredInline +
                  '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
                '</div>' +
                '<div class="formio-errors">' +
                  '<formio-errors ng-if="::!options.building"></formio-errors>' +
                '</div>' +
              '</td>' +
              '<td><a ng-click="(readOnly || formioForm.submitting)? null:removeFieldValue($index) " ng-disabled = "readOnly || formioForm.submitting" class="btn btn-default"><span class="glyphicon glyphicon-remove-circle"></span></a></td>' +
            '</tr>' +
            '<tr>' +
              '<td colspan="2"><a ng-click="(readOnly || formioForm.submitting)? null: addFieldValue() " ng-disabled = "readOnly || formioForm.submitting" class="btn btn-primary"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> {{ component.addAnother || "Add Another" | formioTranslate:null:options.building }}</a></td>' +
            '</tr>' +
          '</table>' +
          inputBottomLabel +
        '</div>' +
        '<div ng-if="!!component.description" class="help-block">' +
          '<span  id="{{component.key + \'Desc\'}}">{{ component.description |' +
        ' formioTranslate:null:options.building' +
        ' }}</span>' +
        '</div>';
      return template;
    },

    /**
     * Check if a component is required
     *
     * @param {Object} component The component to be checked
     * @param {Array} componentsToRequire An array of component keys manually set to mark specific components as required
     */
    isRequired: function(component, componentsToRequire) {
      return (component.validate && component.validate.required) || (Array.isArray(componentsToRequire) && componentsToRequire.indexOf(component.key) !== -1);
    },
    topOrLeftOptionLabel: function(position) {
      return [
        'top',
        'left'
      ].indexOf(position) !== -1;
    },
    getOptionLabelStyles: function(position) {
      if (position === 'left') {
        return {
          'text-align': 'center',
          'padding-left': 0
        };
      }

      if (optionsLabelOnTheTopOrBottom(position)) {
        return {
          display: 'block',
          'text-align': 'center',
          'padding-left': 0
        };
      }

      return null;
    },
    getOptionInputStyles: function(position) {
      if (position === 'left') {
        return {
          position: 'initial',
          'margin-left': 0
        };
      }

      if (optionsLabelOnTheTopOrBottom(position)) {
        return {
          width: '100%',
          position: 'initial',
          'margin-left': 0
        };
      }

      return null;
    },
    labelPositionWrapper: function(fn) {
      return function(component) {
        return fn(component.labelPosition);
      };
    },
    optionsLabelPositionWrapper: function(fn) {
      return function(component) {
        return fn(component.optionsLabelPosition);
      };
    }
  };
};
