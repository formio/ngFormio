(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function (app) {

  /*jshint camelcase: false */
  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('address', {
        title: 'Address',
        template: function ($scope) {
          return $scope.component.multiple ? 'formio/components/address-multiple.html' : 'formio/components/address.html';
        },
        controller: function (settings, $scope, $http) {
          $scope.address = {};
          $scope.addresses = [];
          $scope.refreshAddress = function (address) {
            var params = {address: address, sensor: false};
            return $http.get(
              'https://maps.googleapis.com/maps/api/geocode/json',
              {
                disableJWT: true,
                params: params,
                headers: {
                  Authorization: undefined,
                  Pragma: undefined,
                  'Cache-Control': undefined
                }
              }
            ).then(function (response) {
                $scope.addresses = response.data.results;
              });
          };
        },
        tableView: function (data) {
          return data ? data.formatted_address : '';
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'addressField',
          placeholder: '',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/address.html',
        '<label ng-if="component.label" for="{{ component.key }}" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>' +
        '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>' +
        '<ui-select ng-model="data[component.key]" safe-multiple-to-single ng-disabled="readOnly" ng-required="component.validate.required" id="{{ component.key }}" theme="bootstrap">' +
        '<ui-select-match placeholder="{{ component.placeholder }}">{{$item.formatted_address || $select.selected.formatted_address}}</ui-select-match>' +
        '<ui-select-choices repeat="address in addresses track by $index" refresh="refreshAddress($select.search)" refresh-delay="500">' +
        '<div ng-bind-html="address.formatted_address | highlight: $select.search"></div>' +
        '</ui-select-choices>' +
        '</ui-select>'
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/address-multiple.html',
        $templateCache.get('formio/components/address.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],2:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('button', {
        title: 'Button',
        template: 'formio/components/button.html',
        settings: {
          input: true,
          label: 'Submit',
          tableView: false,
          key: 'submit',
          size: 'md',
          leftIcon: '',
          rightIcon: '',
          block: false,
          action: 'submit',
          disableOnInvalid: true,
          theme: 'primary'
        },
        controller: function (settings, $scope) {
          $scope.onClick = function () {
            switch (settings.action) {
              case 'submit':
                return;
              case 'reset':
                $scope.resetForm();
                break;
            }
          };
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/button.html',
        '<button type="{{component.action == \'submit\' ? \'submit\' : \'button\'}}"' +
        'ng-class="{\'btn-block\': component.block}"' +
        'class="btn btn-{{ component.theme }} btn-{{ component.size }}"' +
        'ng-disabled="readOnly || form.submitting || (component.disableOnInvalid && form.$invalid)"' +
        'ng-click="onClick()">' +
        '<span ng-if="component.leftIcon" class="{{ component.leftIcon }}" aria-hidden="true"></span>' +
        '<span ng-if="component.leftIcon && component.label">&nbsp;</span>' +
        '{{ component.label }}' +
        '<span ng-if="component.rightIcon && component.label">&nbsp;</span>' +
        '<span ng-if="component.rightIcon" class="{{ component.rightIcon }}" aria-hidden="true"></span>' +
        ' <i ng-if="component.action == \'submit\' && form.submitting" class="glyphicon glyphicon-refresh glyphicon-spin"></i>' +
        '</button>'
      );
    }
  ]);
};

},{}],3:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('checkbox', {
        title: 'Check Box',
        template: 'formio/components/checkbox.html',
        settings: {
          input: true,
          inputType: 'checkbox',
          tableView: true,
          // This hides the default label layout so we can use a special inline label
          hideLabel: true,
          label: '',
          key: 'checkboxField',
          prefix: '',
          suffix: '',
          defaultValue: false,
          protected: false,
          persistent: true,
          validate: {
            required: false,
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/checkbox.html', FormioUtils.fieldWrap(
        '<div class="checkbox">' +
        '<label for={{ component.key }} ng-class="{\'field-required\': component.validate.required}">' +
        '<input type="{{ component.inputType }}" ' +
        'id="{{ component.key }}" ' +
        'name="{{ component.key }}" ' +
        'value="{{ component.key }}" ' +
        'ng-disabled="readOnly" ' +
        'ng-model="data[component.key]" ' +
        'ng-required="component.validate.required">' +
        '{{ component.label }}' +
        '</label>' +
        '</div>'
      ));
    }
  ]);
};

},{}],4:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('columns', {
        title: 'Columns',
        template: 'formio/components/columns.html',
        group: 'layout',
        settings: {
          input: false,
          columns: [{components: []}, {components: []}]
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/columns.html',
        '<div class="row">' +
        '<div class="col-xs-6" ng-repeat="column in component.columns">' +
        '<formio-component ng-repeat="component in column.components" ng-if="componentFound(component)" component="component" data="data" formio="formio" read-only="readOnly"></formio-component>' +
        '</div>' +
        '</div>'
      );
    }
  ]);
};

},{}],5:[function(require,module,exports){
module.exports = function (app) {

  app.provider('formioComponents', function () {
    var components = {};
    var groups = {
      __component: {
        title: 'Form Components'
      },
      layout: {
        title: 'Layout Components'
      }
    };
    return {
      addGroup: function (name, group) {
        groups[name] = group;
      },
      register: function (type, component, group) {
        if (!components[type]) {
          components[type] = component;
        }
        else {
          angular.extend(components[type], component);
        }

        // Set the type for this component.
        if (!components[type].group) {
          components[type].group = group || '__component';
        }
        components[type].settings.type = type;
      },
      $get: function () {
        return {
          components: components,
          groups: groups
        };
      }
    };
  });

  app.directive('safeMultipleToSingle', [function () {
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function ($scope, el, attrs, ngModel) {
        ngModel.$formatters.push(function (modelValue) {
          if (!$scope.component.multiple && Array.isArray(modelValue)) {
            return modelValue[0] || '';
          }

          return modelValue;
        });
      }
    };
  }]);
};

},{}],6:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('content', {
        title: 'Content',
        template: 'formio/components/content.html',
        settings: {
          input: false,
          html: ''
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/content.html',
        '<div ng-bind-html="component.html | safehtml"></div>'
      );
    }
  ]);
};

},{}],7:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('datetime', {
        title: 'Date / Time',
        template: 'formio/components/datetime.html',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'datetimeField',
          placeholder: '',
          format: 'yyyy-MM-dd HH:mm',
          enableDate: true,
          enableTime: true,
          minDate: null,
          maxDate: null,
          datepickerMode: 'day',
          datePicker: {
            showWeeks: true,
            startingDay: 0,
            initDate: '',
            minMode: 'day',
            maxMode: 'year',
            yearRange: '20'
          },
          timePicker: {
            hourStep: 1,
            minuteStep: 1,
            showMeridian: true,
            readonlyInput: false,
            mousewheel: true,
            arrowkeys: true
          },
          protected: false,
          persistent: true,
          validate: {
            required: false,
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache, FormioUtils) {
      $templateCache.put('formio/components/datetime.html', FormioUtils.fieldWrap(
        '<div class="input-group">' +
        '<input type="text" class="form-control" ' +
        'ng-focus="calendarOpen = true" ' +
        'ng-click="calendarOpen = true" ' +
        'ng-init="calendarOpen = false" ' +
        'ng-disabled="readOnly" ' +
        'ng-required="component.validate.required" ' +
        'is-open="calendarOpen" ' +
        'datetime-picker="{{ component.format }}" ' +
        'min-date="component.minDate" ' +
        'max-date="component.maxDate" ' +
        'datepicker-mode="component.datepickerMode" ' +
        'enable-date="component.enableDate" ' +
        'enable-time="component.enableTime" ' +
        'ng-model="data[component.key]" ' +
        'placeholder="{{ component.placeholder }}" ' +
        'datepicker-options="component.datePicker" ' +
        'timepicker-options="component.timePicker" />' +
        '<span class="input-group-btn">' +
        '<button type="button" class="btn btn-default" ng-click="calendarOpen = true">' +
        '<i ng-if="component.enableDate" class="glyphicon glyphicon-calendar"></i>' +
        '<i ng-if="!component.enableDate" class="glyphicon glyphicon-time"></i>' +
        '</button>' +
        '</span>' +
        '</div>'
      ));
    }
  ]);
}

},{}],8:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('email', {
        title: 'Email',
        template: 'formio/components/textfield.html',
        settings: {
          input: true,
          tableView: true,
          inputType: 'email',
          label: '',
          key: 'emailField',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true
        }
      });
    }
  ]);
};

},{}],9:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('fieldset', {
        title: 'Field Set',
        template: 'formio/components/fieldset.html',
        settings: {
          input: false,
          tableView: true,
          legend: '',
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/fieldset.html',
        '<fieldset>' +
        '<legend ng-if="component.legend">{{ component.legend }}</legend>' +
        '<formio-component ng-repeat="component in component.components" ng-if="componentFound(component)" component="component" data="data" formio="formio" read-only="readOnly"></formio-component>' +
        '</fieldset>'
      );
    }
  ]);
};

},{}],10:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('hidden', {
        title: 'Hidden',
        template: 'formio/components/hidden.html',
        settings: {
          input: true,
          tableView: true,
          key: 'hiddenField',
          label: '',
          protected: false,
          unique: false,
          persistent: true
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/hidden.html',
        '<input type="hidden" id="{{ component.key }}" name="{{ component.key }}" ng-model="data[component.key]">'
      );
    }
  ]);
};

},{}],11:[function(require,module,exports){
'use strict'

var app = angular.module('formio');

require('./components')(app);
require('./textfield')(app);
require('./address')(app);
require('./button')(app);
require('./checkbox')(app);
require('./columns')(app);
require('./content')(app);
require('./datetime')(app);
require('./email')(app);
require('./fieldset')(app);
require('./hidden')(app);
require('./number')(app);
require('./page')(app);
require('./panel')(app);
require('./password')(app);
require('./phonenumber')(app);
require('./radio')(app);
require('./resource')(app);
require('./select')(app);
require('./signature')(app);
require('./textarea')(app);
require('./well')(app);

},{"./address":1,"./button":2,"./checkbox":3,"./columns":4,"./components":5,"./content":6,"./datetime":7,"./email":8,"./fieldset":9,"./hidden":10,"./number":12,"./page":13,"./panel":14,"./password":15,"./phonenumber":16,"./radio":17,"./resource":18,"./select":19,"./signature":20,"./textarea":21,"./textfield":22,"./well":23}],12:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('number', {
        title: 'Number',
        template: 'formio/components/number.html',
        settings: {
          input: true,
          tableView: true,
          inputType: 'number',
          label: '',
          key: 'numberField',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          validate: {
            required: false,
            min: '',
            max: '',
            step: 'any',
            integer: '',
            multiple: '',
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/number.html', FormioUtils.fieldWrap(
        '<input type="{{ component.inputType }}" ' +
        'class="form-control" ' +
        'id="{{ component.key }}" ' +
        'name="{{ component.key }}" ' +
        'ng-model="data[component.key]" ' +
        'ng-required="component.validate.required" ' +
        'ng-disabled="readOnly" ' +
        'safe-multiple-to-single ' +
        'min="{{ component.validate.min }}" ' +
        'max="{{ component.validate.max }}" ' +
        'step="{{ component.validate.step }}" ' +
        'placeholder="{{ component.placeholder }}" ' +
        'custom-validator="component.validate.custom" ' +
        'formio-input-mask="{{ component.inputMask }}">'
      ));
    }
  ]);
};

},{}],13:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('page', {
        template: 'formio/components/page.html',
        settings: {
          input: false,
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/page.html',
        '<formio-component ng-repeat="component in component.components" ng-if="componentFound(component)" component="component" data="data" formio="formio"></formio-component>'
      );
    }
  ]);
};

},{}],14:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('panel', {
        title: 'Panel',
        template: 'formio/components/panel.html',
        group: 'layout',
        settings: {
          input: false,
          title: '',
          theme: 'default',
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/panel.html',
        '<div class="panel panel-{{ component.theme }}">' +
        '<div ng-if="component.title" class="panel-heading"><h3 class="panel-title">{{ component.title }}</h3></div>' +
        '<div class="panel-body">' +
        '<formio-component ng-repeat="component in component.components" ng-if="componentFound(component)" component="component" data="data" formio="formio" read-only="readOnly"></formio-component>' +
        '</div>' +
        '</div>'
      );
    }
  ]);
};

},{}],15:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('password', {
        title: 'Password',
        template: 'formio/components/textfield.html',
        tableView: function () {
          return '--- PROTECTED ---';
        },
        settings: {
          input: true,
          tableView: false,
          inputType: 'password',
          label: '',
          key: 'passwordField',
          placeholder: '',
          prefix: '',
          suffix: '',
          protected: true,
          persistent: true
        }
      });
    }
  ]);
};

},{}],16:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('phoneNumber', {
        title: 'Phone Number',
        template: 'formio/components/textfield.html',
        settings: {
          input: true,
          tableView: true,
          inputMask: '(999) 999-9999',
          label: '',
          key: 'phonenumberField',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
};

},{}],17:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('radio', {
        title: 'Radio',
        template: 'formio/components/radio.html',
        settings: {
          input: true,
          tableView: true,
          inputType: 'radio',
          label: '',
          key: 'radioField',
          values: [],
          defaultValue: '',
          protected: false,
          persistent: true,
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
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/radio.html', FormioUtils.fieldWrap(
        '<div class="radio" ng-repeat="v in component.values track by $index">' +
        '<label class="control-label" for="value">' +
        '<input type="{{ component.inputType }}" ' +
        'id="{{ v.value }}" ' +
        'name="{{ component.key }}" ' +
        'value="{{ v.value }}" ' +
        'ng-model="data[component.key]" ' +
        'ng-required="component.validate.required" ' +
        'ng-disabled="readOnly"' +
        'custom-validator="component.validate.custom">' +
        '{{ v.label }}' +
        '</label>' +
        '</div>'
      ));
    }
  ]);
};

},{}],18:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('resource', {
        title: 'Resource',
        tableView: function (data) {
          return data ? data._id : '';
        },
        template: function ($scope) {
          return $scope.component.multiple ? 'formio/components/resource-multiple.html' : 'formio/components/resource.html';
        },
        controller: function (settings, $scope, $http, Formio) {
          $scope.selectItems = [];
          if (settings.multiple) {
            settings.defaultValue = [];
          }
          if (settings.resource) {
            var formio = new Formio($scope.formio.projectUrl + '/form/' + settings.resource);
            var params = {};

            // If they wish to filter the results.
            if (settings.selectFields) {
              params.select = settings.selectFields;
            }

            if (settings.searchExpression && settings.searchFields) {
              var search = new RegExp(settings.searchExpression);
              $scope.refreshSubmissions = function (input) {
                if (!input) {
                  return [];
                }
                var matches = input.match(search);
                var shouldRequest = false;
                if (matches && matches.length > 1) {
                  angular.forEach(settings.searchFields, function (field, index) {
                    if ((matches.length > (index + 1)) && matches[index + 1]) {
                      params[field] = matches[index + 1];
                      shouldRequest = true;
                    }
                  });
                }

                // Do not request unless we have parameters.
                if (!shouldRequest) {
                  return;
                }
              };
            }
            else {

              // Load all submissions.
              $scope.refreshSubmissions = function () {
              };
            }

            // Load the submissions.
            formio.loadSubmissions({
              params: params
            }).then(function (submissions) {
              $scope.selectItems = submissions || [];
            });
          }
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'resourceField',
          placeholder: '',
          resource: '',
          defaultValue: '',
          template: '<span>{{ item.data }}</span>',
          selectFields: '',
          searchExpression: '',
          searchFields: '',
          multiple: false,
          refresh: false,
          refreshDelay: 0,
          validate: {
            required: false
          }
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/resource.html',
        '<label ng-if="component.label" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>' +
        '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>' +
        '<ui-select ui-select-required safe-multiple-to-single ui-select-open-on-focus ng-model="data[component.key]" ng-disabled="readOnly" ng-required="component.validate.required" id="{{ component.key }}" name="{{ component.key }}" theme="bootstrap">' +
        '<ui-select-match placeholder="{{ component.placeholder }}">' +
        '<formio-select-item template="component.template" item="$item || $select.selected" select="$select"></formio-select-item>' +
        '</ui-select-match>' +
        '<ui-select-choices repeat="item in selectItems | filter: $select.search" refresh="refreshSubmissions($select.search)" refresh-delay="1000">' +
        '<formio-select-item template="component.template" item="item" select="$select"></formio-select-item>' +
        '</ui-select-choices>' +
        '</ui-select>' +
        '<formio-errors></formio-errors>'
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/resource-multiple.html',
        $templateCache.get('formio/components/resource.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],19:[function(require,module,exports){
module.exports = function (app) {

  app.directive('formioSelectItem', [
    '$compile',
    function ($compile) {
      return {
        restrict: 'E',
        scope: {
          template: '=',
          item: '=',
          select: '='
        },
        link: function (scope, element) {
          if (scope.template) {
            element.html($compile(angular.element(scope.template))(scope));
          }
        }
      };
    }
  ]);

  app.directive('uiSelectRequired', function () {
    return {
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {
        var oldIsEmpty = ngModel.$isEmpty;
        ngModel.$isEmpty = function (value) {
          return (Array.isArray(value) && value.length === 0) || oldIsEmpty(value);
        };
      }
    };
  });

// A hack to have ui-select open on focus
  app.directive('uiSelectOpenOnFocus', ['$timeout', function ($timeout) {
    return {
      require: 'uiSelect',
      restrict: 'A',
      link: function ($scope, el, attrs, uiSelect) {
        var closing = false;

        angular.element(uiSelect.focusser).on('focus', function () {
          if (!closing) {
            uiSelect.activate();
          }
        });

        // Because ui-select immediately focuses the focusser after closing
        // we need to not re-activate after closing
        $scope.$on('uis:close', function () {
          closing = true;
          $timeout(function () { // I'm so sorry
            closing = false;
          });
        });
      }
    };
  }]);

// Configure the Select component.
  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('select', {
        title: 'Select',
        template: function ($scope) {
          return $scope.component.multiple ? 'formio/components/select-multiple.html' : 'formio/components/select.html';
        },
        controller: function (settings, $scope, $http, Formio) {
          $scope.nowrap = true;
          $scope.selectItems = [];
          var valueProp = $scope.component.valueProperty;
          $scope.getSelectItem = function (item) {
            if (!item) {
              return '';
            }
            if (settings.dataSrc === 'values') {
              return item.value;
            }
            return valueProp ? item[valueProp] : item;
          };

          if (settings.multiple) {
            settings.defaultValue = [];
          }

          switch (settings.dataSrc) {
            case 'values':
              $scope.selectItems = settings.data.values;
              break;
            case 'json':
              try {
                $scope.selectItems = angular.fromJson(settings.data.json);
              }
              catch (error) {
                $scope.selectItems = [];
              }
              break;
            case 'url':
              var options = {cache: true};
              if (settings.data.url.substr(0, 1) === '/') {
                settings.data.url = Formio.baseUrl + settings.data.url;
              }

              // Disable auth for outgoing requests.
              if (settings.data.url.indexOf(Formio.baseUrl) === -1) {
                options = {
                  disableJWT: true,
                  headers: {
                    Authorization: undefined,
                    Pragma: undefined,
                    'Cache-Control': undefined
                  }
                };
              }
              $http.get(settings.data.url, options).success(function (data) {
                $scope.selectItems = data;
              });
              break;
            default:
              $scope.selectItems = [];
          }
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'selectField',
          placeholder: '',
          data: {
            values: [{
              value: 'value1',
              label: 'Value 1'
            },
              {
                value: 'value2',
                label: 'Value 2'
              }],
            json: '',
            url: ''
          },
          dataSrc: 'values',
          valueProperty: '',
          defaultValue: '',
          template: '<span>{{ item.label }}</span>',
          multiple: false,
          refresh: false,
          refreshDelay: 0,
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/select.html',
        '<label ng-if="component.label" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>' +
        '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>' +
        '<ui-select ui-select-required ui-select-open-on-focus ng-model="data[component.key]" safe-multiple-to-single name="{{ component.key }}" ng-disabled="readOnly" ng-required="component.validate.required" id="{{ component.key }}" theme="bootstrap">' +
        '<ui-select-match placeholder="{{ component.placeholder }}">' +
        '<formio-select-item template="component.template" item="$item || $select.selected" select="$select"></formio-select-item>' +
        '</ui-select-match>' +
        '<ui-select-choices repeat="getSelectItem(item) as item in selectItems | filter: $select.search">' +
        '<formio-select-item template="component.template" item="item" select="$select"></formio-select-item>' +
        '</ui-select-choices>' +
        '</ui-select>' +
        '<formio-errors></formio-errors>'
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/select-multiple.html',
        $templateCache.get('formio/components/select.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],20:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('signature', {
        title: 'Signature',
        template: 'formio/components/signature.html',
        tableView: function (data) {
          return data ? 'Yes' : 'No';
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'signature',
          placeholder: '',
          footer: 'Sign above',
          width: '100%',
          height: '150',
          penColor: 'black',
          backgroundColor: 'rgb(245,245,235)',
          minWidth: '0.5',
          maxWidth: '2.5',
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.directive('signature', function () {
    return {
      restrict: 'A',
      scope: {
        component: '='
      },
      require: '?ngModel',
      link: function (scope, element, attrs, ngModel) {
        if (!ngModel) {
          return;
        }

        // Sets the label of component for error display.
        scope.component.label = 'Signature';
        scope.component.hideLabel = true;

        // Sets the dimension of a width or height.
        var setDimension = function (dim) {
          if (scope.component[dim].slice(-1) === '%') {
            var percent = parseFloat(scope.component[dim].slice(0, -1)) / 100;
            element[0][dim] = element.parent()[dim]() * percent;
          }
          else {
            element[0][dim] = parseInt(scope.component[dim], 10);
            scope.component[dim] += 'px';
          }
        };

        // Set the width and height of the canvas.
        setDimension('width');
        setDimension('height');

        // Create the signature pad.
        /* global SignaturePad:false */
        var signaturePad = new SignaturePad(element[0], {
          minWidth: scope.component.minWidth,
          maxWidth: scope.component.maxWidth,
          penColor: scope.component.penColor,
          backgroundColor: scope.component.backgroundColor
        });

        scope.$watch('component.penColor', function (newValue) {
          signaturePad.penColor = newValue;
        });

        scope.$watch('component.backgroundColor', function (newValue) {
          signaturePad.backgroundColor = newValue;
          signaturePad.clear();
        });

        // Clear the signature.
        scope.component.clearSignature = function () {
          signaturePad.clear();
          readSignature();
        };

        // Set some CSS properties.
        element.css({
          'border-radius': '4px',
          'box-shadow': '0 0 5px rgba(0, 0, 0, 0.02) inset',
          'border': '1px solid #f4f4f4'
        });

        function readSignature() {
          if (scope.component.validate.required && signaturePad.isEmpty()) {
            ngModel.$setViewValue('');
          } else {
            ngModel.$setViewValue(signaturePad.toDataURL());
          }
        }

        ngModel.$render = function () {
          signaturePad.fromDataURL(ngModel.$viewValue);
        };
        signaturePad.onEnd = function () {
          scope.$evalAsync(readSignature);
        };

        // Read initial empty canvas, unless signature is required, then keep it pristine
        if (!scope.component.validate.required) {
          readSignature();
        }
      }
    };
  });
  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/signature.html', FormioUtils.fieldWrap(
        '<img ng-if="readOnly" ng-attr-src="{{data[component.key]}}" src="" />' +
        '<div ng-if="!readOnly" style="width: {{ component.width }}; height: {{ component.height }};">' +
        '<a class="btn btn-xs btn-default" style="position:absolute; left: 0; top: 0; z-index: 1000" ng-click="component.clearSignature()"><span class="glyphicon glyphicon-refresh"></span></a>' +
        '<canvas signature component="component" name="{{ component.key }}" ng-model="data[component.key]" ng-required="component.validate.required"></canvas>' +
        '<div class="formio-signature-footer" style="text-align: center;color:#C3C3C3;" ng-class="{\'field-required\': component.validate.required}">{{ component.footer }}</div>' +
        '</div>'
      ));
    }
  ]);
};

},{}],21:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('textarea', {
        title: 'Text Area',
        template: 'formio/components/textarea.html',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'textareaField',
          placeholder: '',
          prefix: '',
          suffix: '',
          rows: 3,
          multiple: false,
          defaultValue: '',
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/textarea.html', FormioUtils.fieldWrap(
        '<textarea ' +
        'class="form-control" ' +
        'ng-model="data[component.key]" ' +
        'ng-disabled="readOnly" ' +
        'ng-required="component.validate.required" ' +
        'safe-multiple-to-single ' +
        'id="{{ component.key }}" ' +
        'placeholder="{{ component.placeholder }}" ' +
        'custom-validator="component.validate.custom" ' +
        'rows="{{ component.rows }}"></textarea>'
      ));
    }
  ]);
};

},{}],22:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('textfield', {
        title: 'Text Field',
        template: 'formio/components/textfield.html',
        settings: {
          input: true,
          tableView: true,
          inputType: 'text',
          inputMask: '',
          label: '',
          key: 'textField',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
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
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/textfield.html', FormioUtils.fieldWrap(
        '<input type="{{ component.inputType }}" ' +
        'class="form-control" ' +
        'id="{{ component.key }}" ' +
        'name="{{ component.key }}" ' +
        'ng-disabled="readOnly" ' +
        'ng-model="data[component.key]" ' +
        'ng-model-options="{ debounce: 500 }" ' +
        'safe-multiple-to-single ' +
        'ng-required="component.validate.required" ' +
        'ng-minlength="component.validate.minLength" ' +
        'ng-maxlength="component.validate.maxLength" ' +
        'custom-validator="component.validate.custom" ' +
        'placeholder="{{ component.placeholder }}" ' +
        'formio-input-mask="{{ component.inputMask }}">'
      ));
    }
  ]);
};

},{}],23:[function(require,module,exports){
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('well', {
        title: 'Well',
        template: 'formio/components/well.html',
        group: 'layout',
        settings: {
          input: false,
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/well.html',
        '<div class="well">' +
        '<formio-component ng-repeat="component in component.components" ng-if="componentFound(component)" component="component" data="data" formio="formio" read-only="readOnly"></formio-component>' +
        '</div>'
      );
    }
  ]);
};

},{}],24:[function(require,module,exports){
'use strict'

module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, ele, attrs, ctrl) {
      if (
        !scope.component.validate ||
        !scope.component.validate.custom
      ) {
        return;
      }
      ctrl.$parsers.unshift(function(input) {
        var valid = true;
        if (input) {
          var custom = scope.component.validate.custom;
          custom = custom.replace(/({{\s+(.*)\s+}})/, function(match, $1, $2) {
            return scope.data[$2];
          });
          /* jshint evil: true */
          valid = eval(custom);
          ctrl.$setValidity('custom', (valid === true));
        }
        if (valid !== true) {
          scope.component.customError = valid;
        }
        return (valid === true) ? input : valid;
      });
    }
  };
};

},{}],25:[function(require,module,exports){
'use strict'

module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=',
      formAction: '=',
      form: '=',
      submission: '=',
      readOnly: '='
    },
    controller: [
      '$scope',
      '$http',
      '$element',
      'FormioScope',
      'Formio',
      'FormioUtils',
      'formioComponents',
      function(
        $scope,
        $http,
        $element,
        FormioScope,
        Formio,
        FormioUtils,
        formioComponents
      ) {
        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        // Add the live form parameter to the url.
        if ($scope.src && ($scope.src.indexOf('live=') === -1)) {
          $scope.src += ($scope.src.indexOf('?') === -1) ? '?' : '&';
          $scope.src += 'live=1';
        }

        // Create the formio object.
        $scope.formio = FormioScope.register($scope, $element, {
          form: true,
          submission: true
        });

        // See if a component is found in the registry.
        $scope.componentFound = function(component) {
          return formioComponents.components.hasOwnProperty(component.type);
        };

        // Called when the form is submitted.
        $scope.onSubmit = function(form) {
          if (!$scope.formioForm.$valid || form.submitting) { return; }
          form.submitting = true;

          // Create a sanitized submission object.
          var submissionData = {data: {}};
          if ($scope._submission._id) {
            submissionData._id = $scope._submission._id;
          }
          if ($scope._submission.data._id) {
            submissionData._id = $scope._submission.data._id;
          }

          var components = FormioUtils.flattenComponents($scope._form.components);
          angular.forEach(components, function(component) {
            if ($scope._submission.data.hasOwnProperty(component.key)) {
              submissionData.data[component.key] = $scope._submission.data[component.key];
            }
          });
          angular.forEach($scope._submission.data, function(value, key) {
            if (value && !value.hasOwnProperty('_id')) {
              submissionData.data[key] = value;
            }
          });

          // Called when a submission has been made.
          var onSubmitDone = function(method, submission) {
            $scope.showAlerts({
              type: 'success',
              message: 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.'
            });
            form.submitting = false;
            // Trigger the form submission.
            $scope.$emit('formSubmission', submission);
          };

          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            $http[method]($scope.action, submissionData).success(function (submission) {
              Formio.clearCache();
              onSubmitDone(method, submission);
            }).error(FormioScope.onError($scope, $element))
              .finally(function() {
                form.submitting = false;
              });
          }

          // If they wish to submit to the default location.
          else if ($scope.formio) {
            $scope.formio.saveSubmission(submissionData).then(function(submission) {
              onSubmitDone(submission.method, submission);
            }, FormioScope.onError($scope, $element))
              .finally(function() {
                form.submitting = false;
              });
          }
          else {
            $scope.$emit('formSubmission', submissionData);
          }
        };
      }
    ],
    templateUrl: 'formio.html'
  };
};

},{}],26:[function(require,module,exports){
'use strict'

module.exports = [
  'Formio',
  'formioComponents',
  function(
    Formio,
    formioComponents
  ) {
    return {
      replace: true,
      restrict: 'E',
      scope: {
        component: '=',
        data: '=',
        formio: '=',
        form: '=',
        readOnly: '='
      },
      templateUrl: 'formio/component.html',
      controller: [
        '$scope',
        '$http',
        function(
          $scope,
          $http
        ) {

          $scope.resetForm = function() {
            // Manually remove each key so we don't lose a reference to original
            // data in child scopes.
            for(var key in $scope.data) {
              delete $scope.data[key];
            }
          };

          // Initialize the data.
          if (!$scope.data) {
            $scope.resetForm();
          }

          // If this component references an object, we need to determine the
          // value by navigating through the object.
          if (
            $scope.component &&
            $scope.component.key
          ) {
            var root = '';
            if ($scope.component.key.indexOf('.') !== -1) {
              root = $scope.component.key.split('.').shift();
            }
            $scope.$watch('data', function(data) {
              if (!data || angular.equals({}, data)) { return; }
              if (root && (!data.hasOwnProperty(root) || angular.equals({}, data[root]))) { return; }
              if (root && data[root].hasOwnProperty('_id')) {
                $scope.data[root + '._id'] = data[root]._id;
              }
              var value = Formio.fieldData(data, $scope.component);
              if (value !== undefined) {
                $scope.data[$scope.component.key] = value;
              }
            });
          }

          // See if a component is found in the registry.
          $scope.componentFound = function(component) {
            return formioComponents.components.hasOwnProperty(component.type);
          };

          // Get the settings.
          var component = formioComponents.components[$scope.component.type];
          if (!component) { return; }

          // Set the component with the defaults from the component settings.
          angular.forEach(component.settings, function(value, key) {
            if (!$scope.component.hasOwnProperty(key)) {
              $scope.component[key] = value;
            }
          });

          // Add a new field value.
          $scope.addFieldValue = function() {
            $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [];
            $scope.data[$scope.component.key].push('');
          };

          // Remove a field value.
          $scope.removeFieldValue = function(index) {
            $scope.data[$scope.component.key].splice(index, 1);
          };

          // Set the template for the component.
          if (typeof component.template === 'function') {
            $scope.template = component.template($scope);
          }
          else {
            $scope.template = component.template;
          }

          // Allow component keys to look like "settings[username]"
          if ($scope.component.key && $scope.component.key.indexOf('[') !== -1) {
            var matches = $scope.component.key.match(/([^\[]+)\[([^]+)\]/);
            if ((matches.length === 3) && $scope.data.hasOwnProperty(matches[1])) {
              $scope.data = $scope.data[matches[1]];
              $scope.component.key = matches[2];
            }
          }

          // If the component has a controller.
          if (component.controller) {
            component.controller($scope.component, $scope, $http, Formio);
          }

          // Establish a default for data.
          if ($scope.data && !$scope.data.hasOwnProperty($scope.component.key) && $scope.component.hasOwnProperty('defaultValue')) {
            if($scope.component.multiple && !angular.isArray($scope.component.defaultValue)) {
              $scope.data[$scope.component.key] = [$scope.component.defaultValue];
            }
            else {
              $scope.data[$scope.component.key] = $scope.component.defaultValue;
            }
          }
        }
      ]
    };
  }
];

},{}],27:[function(require,module,exports){
'use strict'

module.exports = [
  '$compile',
  '$templateCache',
  function(
    $compile,
    $templateCache
  ) {
    return {
      scope: false,
      link: function(scope, element) {
        element.replaceWith($compile($templateCache.get(scope.template))(scope));
      },
      controller: function() {
        // This is required for some reason as it will occasionally throw an error without it.
      }
    };
  }
];

},{}],28:[function(require,module,exports){
'use strict'

module.exports = function() {
  return {
    scope: false,
    restrict: 'E',
    templateUrl: 'formio/errors.html'
  };
};

},{}],29:[function(require,module,exports){
'use strict'

module.exports = function() {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      if (attrs.formioInputMask) {
        element.mask(attrs.formioInputMask);
      }
    }
  };
};

},{}],30:[function(require,module,exports){
'use strict'

module.exports = function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      src: '=',
      form: '=',
      submissions: '=',
      perPage: '='
    },
    templateUrl: 'formio/submissions.html',
    controller: [
      '$scope',
      '$element',
      'FormioScope',
      function(
        $scope,
        $element,
        FormioScope
      ) {
        $scope.formio = FormioScope.register($scope, $element, {
          form: true,
          submissions: false
        });

        $scope.tableView = function(component) {
          return !component.hasOwnProperty('tableView') || component.tableView;
        };

        $scope.$watch('_submissions', function(submissions) {
          if (submissions && submissions.length > 0) {
            $scope.$emit('submissionLoad', $scope._submissions);
          }
        });
      }
    ]
  };
};

},{}],31:[function(require,module,exports){
'use strict'

module.exports = [
  'Formio',
  'formioComponents',
  function(
    Formio,
    formioComponents
  ) {
    return {
      onError: function($scope, $element) {
        return function(error) {
          if (error.name === 'ValidationError') {
            $element.find('#form-group-' + error.details[0].path).addClass('has-error');
            var message = 'ValidationError: ' + error.details[0].message;
            $scope.showAlerts({
              type: 'danger',
              message: message
            });
          }
          else {
            $scope.showAlerts({
              type: 'danger',
              message: error
            });
          }
          $scope.$emit('formError', error);
        };
      },
      register: function($scope, $element, options) {
        var loader = null;
        $scope._form = $scope.form || {};
        $scope._submission = $scope.submission || {data: {}};
        $scope._submissions = $scope.submissions || [];

        // Used to set the form action.
        var getAction = function(action) {
          if (!action) { return ''; }
          if ($scope.action) { return ''; }
          if (action.substr(0, 1) === '/') {
            action = Formio.baseUrl + action;
          }
          return action;
        };

        // Set the action.
        $scope.action = getAction($scope.formAction);

        // Allow sub components the ability to add new form components to the form.
        var addedData = {};
        $scope.$on('addFormComponent', function(event, component) {
          if (!addedData.hasOwnProperty(component.settings.key)) {
            addedData[component.settings.key] = true;
            var defaultComponent = formioComponents.components[component.type];
            $scope._form.components.push(angular.extend(defaultComponent.settings, component.settings));
          }
        });

        // Set the action if they provided it in the form.
        $scope.$watch('form.action', function(value) {
          if (!value) { return; }
          var action = getAction(value);
          if (action) {
            $scope.action = action;
          }
        });

        // Return the value and set the scope for the model input.
        $scope.fieldData = function(data, component) {
          var value = Formio.fieldData(data, component);
          var componentInfo = formioComponents.components[component.type];
          if (!componentInfo.tableView) { return value; }
          if (component.multiple && (value.length > 0)) {
            var values = [];
            angular.forEach(value, function(arrayValue) {
              values.push(componentInfo.tableView(arrayValue, component));
            });
            return values;
          }
          return componentInfo.tableView(value, component);
        };

        var spinner = $element.find('#formio-loading');

        if ($scope.src) {
          loader = new Formio($scope.src);
          if (options.form) {
            spinner.show();
            loader.loadForm().then(function(form) {
              $scope._form = form;
              spinner.hide();
              $scope.$emit('formLoad', form);
            }, this.onError($scope));
          }
          if (options.submission) {
            spinner.show();
            loader.loadSubmission().then(function(submission) {
              $scope._submission = submission;
              if (!$scope._submission.data) {
                $scope._submission.data = {};
              }
              spinner.hide();
              $scope.$emit('submissionLoad', submission);
            }, this.onError($scope));
          }
          if (options.submissions) {
            spinner.show();
            loader.loadSubmissions().then(function(submissions) {
              $scope._submissions = submissions;
              spinner.hide();
              $scope.$emit('submissionsLoad', submissions);
            }, this.onError($scope));
          }
        }
        else {

          $scope.formoLoaded = true;
          spinner.hide();

          // Emit the events if these objects are already loaded.
          if ($scope._form) {
            $scope.$emit('formLoad', $scope._form);
          }
          if ($scope._submission) {
            $scope.$emit('submissionLoad', $scope._submission);
          }
          if ($scope._submissions) {
            $scope.$emit('submissionsLoad', $scope._submissions);
          }
        }

        // Return the loader.
        return loader;
      }
    };
  }
];

},{}],32:[function(require,module,exports){
'use strict'

module.exports = function() {
  return {
    flattenComponents: function flatten(components, flattened) {
      flattened = flattened || {};
      angular.forEach(components, function(component) {
        if (component.tree) {
          flattened[component.key] = component;
        }
        else if (component.columns && (component.columns.length > 0)) {
          angular.forEach(component.columns, function(column) {
            flatten(column.components, flattened);
          });
        }
        else if (component.components && (component.components.length > 0)) {
          flatten(component.components, flattened);
        }
        else if (component.input) {
          flattened[component.key] = component;
        }
      });
      return flattened;
    },
    eachComponent: function eachComponent(components, fn) {
      if(!components) {
        return;
      }
      angular.forEach(components, function(component) {
        if (component.columns) {
          angular.forEach(component.columns, function(column) {
            eachComponent(column.components, fn);
          });
        }
        else if (component.components) {
          eachComponent(component.components, fn);
        }
        else {
          fn(component);
        }
      });
    },
    fieldWrap: function(input) {
      input = input + '<formio-errors></formio-errors>';
      var multiInput = input.replace('data[component.key]', 'data[component.key][$index]');
      var inputLabel = '<label ng-if="component.label && !component.hideLabel" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>';
      var requiredInline = '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>';
      var template =
        '<div ng-if="!component.multiple">' +
        inputLabel + requiredInline +
        '<div class="input-group" ng-if="component.prefix || component.suffix">' +
        '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
        input +
        '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
        '</div>' +
        '<div ng-if="!component.prefix && !component.suffix">' + input + '</div>' +
        '</div>' +
        '<div ng-if="component.multiple"><table class="table table-bordered">' +
        inputLabel +
        '<tr ng-repeat="value in data[component.key] track by $index">' +
        '<td>' + requiredInline +
        '<div class="input-group" ng-if="component.prefix || component.suffix">' +
        '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
        multiInput +
        '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
        '</div>' +
        '<div ng-if="!component.prefix && !component.suffix">' + multiInput + '</div>' +
        '</td>' +
        '<td><a ng-click="removeFieldValue($index)" class="btn btn-danger"><span class="glyphicon glyphicon-remove-circle"></span></a></td>' +
        '</tr>' +
        '<tr>' +
        '<td colspan="2"><a ng-click="addFieldValue()" class="btn btn-primary"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> Add another</a></td>' +
        '</tr>' +
        '</table></div>';
      return template;
    }
  };
};

},{}],33:[function(require,module,exports){
'use strict'

module.exports = [
  '$q',
  function($q) {
    var Interceptor = {
      token: '',
      setToken: function(token) {
        token = token || '';
        if (token === this.token) { return; }
        this.token = token;
        if (!token) {
          this.setUser(null);
          return localStorage.removeItem('formioToken');
        }
        localStorage.setItem('formioToken', token);
      },
      getToken: function() {
        if (this.token) { return this.token; }
        var token = localStorage.getItem('formioToken') || '';
        this.token = token;
        return token;
      },
      setUser: function(user) {
        if (!user) {
          this.setToken(null);
          return localStorage.removeItem('formioUser');
        }
        localStorage.setItem('formioUser', angular.toJson(user));
      },
      getUser: function() {
        return localStorage.getItem('formioUser');
      }
    };

    /**
     * Set the JWT token within the request.
     *
     * @type {function(this:{token: string, setToken: Function, getToken: Function})}
     */
    Interceptor.response = function(response) {
      var responseCode = parseInt(response.status, 10);
      var token = response.headers('x-jwt-token');
      if (responseCode === 200 && token && token !== '') {
        this.setToken(token);
      }
      else if (responseCode === 204 && token && token === '') {
        this.setToken(token);
      }
      return response;
    }.bind(Interceptor);

    /**
     * Intercept a response error.
     *
     * @type {function(this:{token: string, setToken: Function, getToken: Function, setUser: Function, getUser: Function})}
     */
    Interceptor.responseError = function(response) {
      if (parseInt(response.status, 10) === 440) {
        response.loggedOut = true;
        this.setToken(null);
      }
      return $q.reject(response);
    }.bind(Interceptor);

    /**
     * Set the token in the request headers.
     *
     * @type {function(this:{token: string, setToken: Function, getToken: Function})}
     */
    Interceptor.request = function(config) {
      if (config.disableJWT) { return config; }
      var token = this.getToken();
      if (token) { config.headers['x-jwt-token'] = token; }
      return config;
    }.bind(Interceptor);
    return Interceptor;
  }
];

},{}],34:[function(require,module,exports){
'use strict'

module.exports = [
  'FormioUtils',
  function(FormioUtils) {
    return FormioUtils.flattenComponents;
  }
];

},{}],35:[function(require,module,exports){
'use strict'

module.exports = [
  '$sce',
  function(
    $sce
  ) {
    return function(html) {
      return $sce.trustAsHtml(html);
    };
  }
];

},{}],36:[function(require,module,exports){
var app = angular.module('formio', [
  'ngSanitize',
  'ui.bootstrap',
  'ui.bootstrap.datetimepicker',
  'ui.select',
  'angularMoment',
  'bgf.paginateAnything'
]);

/**
 * Create the formio provider.
 */
app.provider('Formio', require('./providers/Formio'));

/**
 * Provides a way to regsiter the Formio scope.
 */
app.factory('FormioScope', require('./factories/FormioScope'));

app.factory('FormioUtils', require('./factories/FormioUtils'));

app.factory('formioInterceptor', require('./factories/formioInterceptor'));

app.directive('formio', require('./directives/formio'));

app.directive('formioDelete', require('./directives/formio'));

app.directive('formioErrors', require('./directives/formioErrors'));

app.directive('customValidator', require('./directives/customValidator'));

app.directive('formioSubmissions', require('./directives/formioSubmissions'));

app.directive('formioComponent', require('./directives/formioComponent'));

app.directive('formioElement', require('./directives/formioElement'));

app.directive('formioInputMask', require('./directives/formioInputMask'));

/**
 * Filter to flatten form components.
 */
app.filter('flattenComponents', require('./filters/flattenComponents'));

app.filter('safehtml', require('./filters/safehtml'));

app.config([
  '$httpProvider',
  function(
    $httpProvider
  ) {
    if (!$httpProvider.defaults.headers.get) {
      $httpProvider.defaults.headers.get = {};
    }

    // Disable IE caching for GET requests.
    $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.get.Pragma = 'no-cache';
    $httpProvider.interceptors.push('formioInterceptor');
  }
]);

app.run([
  '$templateCache',
  function($templateCache) {

    // The template for the formio forms.
    $templateCache.put('formio.html',
      '<form role="form" name="formioForm" ng-submit="onSubmit(formioForm)" novalidate>' +
        '<i id="formio-loading" style="font-size: 2em;" class="glyphicon glyphicon-refresh glyphicon-spin"></i>' +
        '<div ng-repeat="alert in formioAlerts" class="alert alert-{{ alert.type }}" role="alert">' +
          '{{ alert.message }}' +
        '</div>' +
        '<formio-component ng-repeat="component in _form.components track by $index" ng-if="componentFound(component)" component="component" data="_submission.data" form="formioForm" formio="formio" read-only="readOnly"></formio-component>' +
      '</form>'
    );

    $templateCache.put('formio-delete.html', '' +
      '<form role="form">' +
        '<div ng-repeat="alert in formioAlerts" class="alert alert-{{ alert.type }}" role="alert">' +
          '{{ alert.message }}' +
        '</div>' +
        '<h3>Are you sure you wish to delete the {{ resourceName || _resourceName }}?</h3>' +
        '<div class="btn-toolbar">' +
          '<button ng-click="onDelete()" class="btn btn-danger">Yes</button>' +
          '<button ng-click="onCancel()" class="btn btn-default">No</button>' +
        '</div>' +
      '</form>'
    );

    $templateCache.put('formio/pager.html',
      '<div class="paginate-anything">' +
        '<ul class="pagination pagination-{{size}} links" ng-if="numPages > 1">' +
          '<li ng-class="{disabled: page <= 0}"><a href ng-click="gotoPage(page-1)">&laquo;</a></li>' +
          '<li ng-if="linkGroupFirst() > 0"><a href ng-click="gotoPage(0)">1</a></li>' +
          '<li ng-if="linkGroupFirst() > 1" class="disabled"><a href>&hellip;</a></li>' +
          '<li ng-repeat="p in [linkGroupFirst(), linkGroupLast()] | makeRange" ng-class="{active: p === page}"><a href ng-click="gotoPage(p)">{{p+1}}</a></li>' +
          '<li ng-if="linkGroupLast() < numPages - 2" class="disabled"><a href>&hellip;</a></li>' +
          '<li ng-if="isFinite() && linkGroupLast() < numPages - 1"><a href ng-click="gotoPage(numPages-1)">{{numPages}}</a></li>' +
          '<li ng-class="{disabled: page >= numPages - 1}"><a href ng-click="gotoPage(page+1)">&raquo;</a></li>' +
        '</ul>' +
      '</div>'
    );

    $templateCache.put('formio/submissions.html',
      '<div>' +
        '<table class="table">' +
          '<thead>' +
            '<tr>' +
              '<th ng-repeat="component in _form.components | flattenComponents" ng-if="tableView(component)">{{ component.label || component.key }}</th>' +
              '<th>Submitted</th>' +
              '<th>Updated</th>' +
              '<th>Operations</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr ng-repeat="submission in _submissions">' +
              '<td ng-repeat="component in _form.components | flattenComponents" ng-if="tableView(component)">{{ fieldData(submission.data, component) }}</td>' +
              '<td>{{ submission.created | amDateFormat:\'l, h:mm:ss a\' }}</td>' +
              '<td>{{ submission.modified | amDateFormat:\'l, h:mm:ss a\' }}</td>' +
              '<td>' +
                '<div class="button-group" style="display:flex;">' +
                  '<a ng-click="$emit(\'submissionView\', submission)" class="btn btn-primary btn-xs"><span class="glyphicon glyphicon-eye-open"></span></a>&nbsp;' +
                  '<a ng-click="$emit(\'submissionEdit\', submission)" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-edit"></span></a>&nbsp;' +
                  '<a ng-click="$emit(\'submissionDelete\', submission)" class="btn btn-danger btn-xs"><span class="glyphicon glyphicon-remove-circle"></span></a>' +
                '</div>' +
              '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
        '<bgf-pagination collection="_submissions" url="formio.submissionsUrl" per-page="perPage" template-url="formio/pager.html"></bgf-pagination>' +
      '</div>'
    );

    // A formio component template.
    $templateCache.put('formio/component.html',
      '<ng-form name="formioFieldForm">' +
        '<div class="form-group has-feedback form-field-type-{{ component.type }}" id="form-group-{{ component.key }}" ng-class="{\'has-error\': formioFieldForm[component.key].$invalid && !formioFieldForm[component.key].$pristine }">' +
          '<formio-element></formio-element>' +
        '</div>' +
      '</ng-form>'
    );

    $templateCache.put('formio/errors.html',
      '<div ng-show="formioFieldForm[component.key].$error && !formioFieldForm[component.key].$pristine">' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.email">{{ component.label || component.key }} must be a valid email.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.required">{{ component.label || component.key }} is required.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.number">{{ component.label || component.key }} must be a number.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.maxlength">{{ component.label || component.key }} must be shorter than {{ component.validate.maxLength + 1 }} characters.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.minlength">{{ component.label || component.key }} must be longer than {{ component.validate.minLength - 1 }} characters.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.min">{{ component.label || component.key }} must be higher than {{ component.validate.min - 1 }}.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.max">{{ component.label || component.key }} must be lower than {{ component.validate.max + 1 }}.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.custom">{{ component.customError }}</p>' +
      '</div>'
    );
  }
]);

require('./components');

},{"./components":11,"./directives/customValidator":24,"./directives/formio":25,"./directives/formioComponent":26,"./directives/formioElement":27,"./directives/formioErrors":28,"./directives/formioInputMask":29,"./directives/formioSubmissions":30,"./factories/FormioScope":31,"./factories/FormioUtils":32,"./factories/formioInterceptor":33,"./filters/flattenComponents":34,"./filters/safehtml":35,"./providers/Formio":37}],37:[function(require,module,exports){
'use strict'

module.exports = function() {

  // The default base url.
  var baseUrl = '';
  var domain;
  var noalias = false;
  var cache = {};

  /**
   * Returns parts of the URL that are important.
   * Indexex
   *  - 0: The full url
   *  - 1: The protocol
   *  - 2: The hostname
   *  - 3: The rest
   *
   * @param url
   * @returns {*}
   */
  var getUrlParts = function(url) {
    return url.match(/^(http[s]?:\/\/)([^/]+)($|\/.*)/);
  };

  // Return the provider interface.
  return {

    // Set the base URL for the formio API.
    setBaseUrl: function(url, _noalias) {
      noalias = _noalias;
      baseUrl = url;
    },
    setDomain: function(dom) {
      domain = dom;
    },
    $get: [
      '$http',
      '$q',
      'formioInterceptor',
      '$location',
      '$rootScope',
      function(
        $http,
        $q,
        formioInterceptor,
        $location,
        $rootScope
      ) {

        // The formio class.
        var Formio = function(path) {

          // Ensure we have an instance of Formio.
          if (!(this instanceof Formio)) { return new Formio(path); }
          if (!path) {
            // Allow user to create new projects if this was instantiated without
            // a url
            this.projectUrl = baseUrl + '/project';
            this.projectId = false;
            this.query = '';
            return;
          }

          // Initialize our variables.
          this.projectUrl = '';
          this.projectId = '';
          this.formUrl = '';
          this.formsUrl = '';
          this.formId = '';
          this.submissionsUrl = '';
          this.submissionUrl = '';
          this.submissionId = '';
          this.actionsUrl = '';
          this.actionId = '';
          this.actionUrl = '';
          this.query = '';

          // Normalize to an absolute path.
          if ((path.indexOf('http') !== 0) && (path.indexOf('//') !== 0)) {
            baseUrl = baseUrl ? baseUrl : $location.absUrl().match(/http[s]?:\/\/api./)[0];
            path = baseUrl + path;
          }

          var hostparts = getUrlParts(path);
          var hostnames = [];
          var subdomain = '';
          if(domain) {
            if(hostparts.length > 2) {
              var domainIndex = hostparts[2].indexOf(domain);
              if(domainIndex !== 0) {
                // Ignore "." between subdomains & domain
                domainIndex--;
              }
              hostnames = hostnames.concat(hostparts[2].substring(0, domainIndex).split('.'));
              hostnames = hostnames.concat(domain);
            }
            if (!noalias && hostnames.length >= 2) {
              subdomain = hostnames[0];
              this.projectId = subdomain;
            }
          }
          // Revert to old behavior if domain is not set
          else {
            hostnames = (hostparts.length > 2) ? hostparts[2].split('.') : [];
            if(!noalias &&
              (((hostnames.length === 2) && (hostnames[1].indexOf('localhost') === 0)) || (hostnames.length >= 3))
            ) {
              subdomain = hostnames[0];
              this.projectId = subdomain;
            }
          }

          // Get the paths for this formio url.
          var subs = path.match(/\/(submission|action)\/?([^?]*)/);
          if (subs && subs.length > 1) {
            subs.shift();
          }

          // Get the base path without submissions and actions.
          // Quick way to test... http://jsfiddle.net/travistidwell/wL49L766/4/
          var paths = [];
          var queryparts = path.split('?');
          this.query = (queryparts.length > 1) ? '?' + queryparts[1] : '';
          path = queryparts[0].replace(/\/(submission|action)($|\/.*)/, '');
          path = path.replace(/\/$/, '');

          // See if this url has a subdomain.
          if (subdomain && subdomain !== 'api') {
            // Get the paths.
            paths = path.match(/(http[s]?:\/\/?.*\..*?)\/([^?]*)?/);
            if (paths && paths.length > 1) {
              paths.shift();
            }
          }
          else {
            var formpaths = path.match(/^http.*\/.*\/form\/?([^?]*)/);
            if (formpaths && formpaths.length > 1) {
              paths[1] = formpaths[1] ? 'form/' + formpaths[1] : '';
              paths[0] = paths[1] ? path.replace('/' + paths[1], '') : path;
            }
            else {
              // Assume this is a project url.
              paths[0] = path;
            }
          }

          if (paths.length > 0) {
            this.projectUrl = paths[0];
            this.projectId = true;
            this.formsUrl = this.projectUrl ? (this.projectUrl + '/form') : '';
            this.formId = (paths.length > 1) ? paths[1] : '';
            this.formUrl = this.projectUrl ? (this.projectUrl + '/' + this.formId) : '';
            this.pathType = (subs && (subs.length > 0)) ? subs[0] : '';
            angular.forEach(['submission', 'action'], function(item) {
              var index = item + 'sUrl';
              var itemId = item + 'Id';
              var itemUrl = item + 'Url';
              this[index] = this.formUrl ? (this.formUrl + '/' + item) : '';
              this[itemId] = (subs && (this.pathType === item) && (subs.length > 1)) ? subs[1] : '';
              this[itemUrl] = this[itemId] ? this[index] + '/' + this[itemId] : this[index];
            }.bind(this));
          }
        };

        /**
         * When a request error occurs.
         * @param deferred
         */
        var requestError = function(deferred) {
          return function(error) {
            if (error === 'Unauthorized') {
              $rootScope.$broadcast('formio.unauthorized', error);
            }
            else if (error === 'Login Timeout') {
              $rootScope.$broadcast('formio.sessionExpired', error);
            }
            deferred.reject(error);
          };
        };

        /**
         * Perform a request GET request with caching abilities.
         *
         * @param url
         * @param query
         * @returns {*}
         */
        var request = function(url, query) {
          var deferred = $q.defer();
          if (!url) { return deferred.promise; }

          // Get the cached promise to save multiple loads.
          var cacheKey = url;
          cacheKey += query ? angular.toJson(query) : '';
          cacheKey = btoa(cacheKey);
          if (cache.hasOwnProperty(cacheKey)) {
            return cache[cacheKey];
          }
          else {

            // Set the cache, then send the request.
            cache[cacheKey] = deferred.promise;
            try {
              $http.get(url, query).success(deferred.resolve).error(requestError(deferred));
            }
            catch (error) {
              deferred.reject(error.message);
            }
          }
          return deferred.promise;
        };

        /**
         * Load a resource.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _load = function(type) {
          var _id = type + 'Id';
          var _url = type + 'Url';
          return function(query) {
            if (!this[_id]) { return $q.defer().promise; }
            return request(this[_url] + this.query, query);
          };
        };

        /**
         * Save a resource.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _save = function(type) {
          var _id = type + 'Id';
          var _url = type + 'Url';
          return function(data) {
            var deferred = $q.defer();
            if (!this[_url]) { return deferred.promise; }
            var method = this[_id] ? 'put' : 'post';
            $http[method](this[_url] + this.query, data)
              .success(function (result) {
                cache = {};
                result.method = method;
                deferred.resolve(result);
              })
              .error(requestError(deferred));
            return deferred.promise;
          };
        };

        /**
         * Delete a resource.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _delete = function(type) {
          var _id = type + 'Id';
          var _url = type + 'Url';
          return function() {
            var deferred = $q.defer();
            if (!this[_id]) { return deferred.promise; }
            cache = {};
            $http.delete(this[_url]).success(deferred.resolve).error(requestError(deferred));
            return deferred.promise;
          };
        };

        /**
         * Resource index method.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _index = function(type) {
          var _url = type + 'sUrl';
          return function(query) {
            return request(this[_url], query);
          };
        };

        // Define specific CRUD methods.
        Formio.prototype.loadProject = _load('project');
        Formio.prototype.saveProject = _save('project');
        Formio.prototype.deleteProject = _delete('project');
        Formio.prototype.loadForm = _load('form');
        Formio.prototype.saveForm = _save('form');
        Formio.prototype.deleteForm = _delete('form');
        Formio.prototype.loadForms = _index('form');
        Formio.prototype.loadSubmission = _load('submission');
        Formio.prototype.saveSubmission = _save('submission');
        Formio.prototype.deleteSubmission = _delete('submission');
        Formio.prototype.loadSubmissions = _index('submission');
        Formio.prototype.loadAction = _load('action');
        Formio.prototype.saveAction = _save('action');
        Formio.prototype.deleteAction = _delete('action');
        Formio.prototype.loadActions = _index('action');
        Formio.prototype.availableActions = function() { return request(this.formUrl + '/actions'); };
        Formio.prototype.actionInfo = function(name) { return request(this.formUrl + '/actions/' + name); };

        // Static methods.
        Formio.loadProjects = function() { return request(baseUrl + '/project'); };
        Formio.clearCache = function() { cache = {}; };
        Formio.baseUrl = baseUrl;
        Formio.setUser = formioInterceptor.setUser.bind(formioInterceptor);
        Formio.getUser = formioInterceptor.getUser.bind(formioInterceptor);
        Formio.setToken = formioInterceptor.setToken.bind(formioInterceptor);
        Formio.getToken = formioInterceptor.getToken.bind(formioInterceptor);
        Formio.currentUser = function() {
          var deferred = $q.defer();
          var user = this.getUser();
          if (user) { deferred.resolve(angular.fromJson(user)); return deferred.promise; }
          var token = this.getToken();
          if (!token) { deferred.resolve(null); return deferred.promise; }
          $http.get(baseUrl + '/current').success(function(user) {
            this.setUser(user);
            deferred.resolve(user);
          }.bind(this)).error(requestError(deferred));
          return deferred.promise;
        };

        // Keep track of their logout callback.
        Formio.logout = function() {
          return $http.get(baseUrl + '/logout').finally(function() {
            this.setToken(null);
            this.setUser(null);
          }.bind(this));
        };
        Formio.fieldData = function(data, component) {
          if (!data) { return ''; }
          if (component.key.indexOf('.') !== -1) {
            var value = data;
            var parts = component.key.split('.');
            var key = '';
            for (var i = 0; i < parts.length; i++) {
              key = parts[i];

              // Handle nested resources
              if (value.hasOwnProperty('_id')) {
                value = value.data;
              }

              // Return if the key is not found on the value.
              if (!value.hasOwnProperty(key)) {
                return;
              }

              // Convert old single field data in submissions to multiple
              if(key === parts[parts.length - 1] && component.multiple && !Array.isArray(value[key])) {
                value[key] = [value[key]];
              }

              // Set the value of this key.
              value = value[key];
            }
            return value;
          }
          else {
            // Convert old single field data in submissions to multiple
            if(component.multiple && !Array.isArray(data[component.key])) {
              data[component.key] = [data[component.key]];
            }
            return data[component.key];
          }
        };

        // Return the formio interface.
        return Formio;
      }
    ]
  };
};

},{}]},{},[36])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29tcG9uZW50cy9hZGRyZXNzLmpzIiwic3JjL2NvbXBvbmVudHMvYnV0dG9uLmpzIiwic3JjL2NvbXBvbmVudHMvY2hlY2tib3guanMiLCJzcmMvY29tcG9uZW50cy9jb2x1bW5zLmpzIiwic3JjL2NvbXBvbmVudHMvY29tcG9uZW50cy5qcyIsInNyYy9jb21wb25lbnRzL2NvbnRlbnQuanMiLCJzcmMvY29tcG9uZW50cy9kYXRldGltZS5qcyIsInNyYy9jb21wb25lbnRzL2VtYWlsLmpzIiwic3JjL2NvbXBvbmVudHMvZmllbGRzZXQuanMiLCJzcmMvY29tcG9uZW50cy9oaWRkZW4uanMiLCJzcmMvY29tcG9uZW50cy9pbmRleC5qcyIsInNyYy9jb21wb25lbnRzL251bWJlci5qcyIsInNyYy9jb21wb25lbnRzL3BhZ2UuanMiLCJzcmMvY29tcG9uZW50cy9wYW5lbC5qcyIsInNyYy9jb21wb25lbnRzL3Bhc3N3b3JkLmpzIiwic3JjL2NvbXBvbmVudHMvcGhvbmVudW1iZXIuanMiLCJzcmMvY29tcG9uZW50cy9yYWRpby5qcyIsInNyYy9jb21wb25lbnRzL3Jlc291cmNlLmpzIiwic3JjL2NvbXBvbmVudHMvc2VsZWN0LmpzIiwic3JjL2NvbXBvbmVudHMvc2lnbmF0dXJlLmpzIiwic3JjL2NvbXBvbmVudHMvdGV4dGFyZWEuanMiLCJzcmMvY29tcG9uZW50cy90ZXh0ZmllbGQuanMiLCJzcmMvY29tcG9uZW50cy93ZWxsLmpzIiwic3JjL2RpcmVjdGl2ZXMvY3VzdG9tVmFsaWRhdG9yLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvQ29tcG9uZW50LmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvRWxlbWVudC5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0Vycm9ycy5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0lucHV0TWFzay5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb1N1Ym1pc3Npb25zLmpzIiwic3JjL2ZhY3Rvcmllcy9Gb3JtaW9TY29wZS5qcyIsInNyYy9mYWN0b3JpZXMvRm9ybWlvVXRpbHMuanMiLCJzcmMvZmFjdG9yaWVzL2Zvcm1pb0ludGVyY2VwdG9yLmpzIiwic3JjL2ZpbHRlcnMvZmxhdHRlbkNvbXBvbmVudHMuanMiLCJzcmMvZmlsdGVycy9zYWZlaHRtbC5qcyIsInNyYy9mb3JtaW8uanMiLCJzcmMvcHJvdmlkZXJzL0Zvcm1pby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuXG4gIC8qanNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdhZGRyZXNzJywge1xuICAgICAgICB0aXRsZTogJ0FkZHJlc3MnLFxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICAgIHJldHVybiAkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlID8gJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MtbXVsdGlwbGUuaHRtbCcgOiAnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy5odG1sJztcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKHNldHRpbmdzLCAkc2NvcGUsICRodHRwKSB7XG4gICAgICAgICAgJHNjb3BlLmFkZHJlc3MgPSB7fTtcbiAgICAgICAgICAkc2NvcGUuYWRkcmVzc2VzID0gW107XG4gICAgICAgICAgJHNjb3BlLnJlZnJlc2hBZGRyZXNzID0gZnVuY3Rpb24gKGFkZHJlc3MpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7YWRkcmVzczogYWRkcmVzcywgc2Vuc29yOiBmYWxzZX07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFxuICAgICAgICAgICAgICAnaHR0cHM6Ly9tYXBzLmdvb2dsZWFwaXMuY29tL21hcHMvYXBpL2dlb2NvZGUvanNvbicsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBkaXNhYmxlSldUOiB0cnVlLFxuICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIFByYWdtYTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgJ0NhY2hlLUNvbnRyb2wnOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWRkcmVzc2VzID0gcmVzcG9uc2UuZGF0YS5yZXN1bHRzO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEgPyBkYXRhLmZvcm1hdHRlZF9hZGRyZXNzIDogJyc7XG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdhZGRyZXNzRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBtdWx0aXBsZTogZmFsc2UsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy5odG1sJyxcbiAgICAgICAgJzxsYWJlbCBuZy1pZj1cImNvbXBvbmVudC5sYWJlbFwiIGZvcj1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiBuZy1jbGFzcz1cIntcXCdmaWVsZC1yZXF1aXJlZFxcJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+JyArXG4gICAgICAgICc8c3BhbiBuZy1pZj1cIiFjb21wb25lbnQubGFiZWwgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXCIgY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+JyArXG4gICAgICAgICc8dWktc2VsZWN0IG5nLW1vZGVsPVwiZGF0YVtjb21wb25lbnQua2V5XVwiIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlIG5nLWRpc2FibGVkPVwicmVhZE9ubHlcIiBuZy1yZXF1aXJlZD1cImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFwiIGlkPVwie3sgY29tcG9uZW50LmtleSB9fVwiIHRoZW1lPVwiYm9vdHN0cmFwXCI+JyArXG4gICAgICAgICc8dWktc2VsZWN0LW1hdGNoIHBsYWNlaG9sZGVyPVwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XCI+e3skaXRlbS5mb3JtYXR0ZWRfYWRkcmVzcyB8fCAkc2VsZWN0LnNlbGVjdGVkLmZvcm1hdHRlZF9hZGRyZXNzfX08L3VpLXNlbGVjdC1tYXRjaD4nICtcbiAgICAgICAgJzx1aS1zZWxlY3QtY2hvaWNlcyByZXBlYXQ9XCJhZGRyZXNzIGluIGFkZHJlc3NlcyB0cmFjayBieSAkaW5kZXhcIiByZWZyZXNoPVwicmVmcmVzaEFkZHJlc3MoJHNlbGVjdC5zZWFyY2gpXCIgcmVmcmVzaC1kZWxheT1cIjUwMFwiPicgK1xuICAgICAgICAnPGRpdiBuZy1iaW5kLWh0bWw9XCJhZGRyZXNzLmZvcm1hdHRlZF9hZGRyZXNzIHwgaGlnaGxpZ2h0OiAkc2VsZWN0LnNlYXJjaFwiPjwvZGl2PicgK1xuICAgICAgICAnPC91aS1zZWxlY3QtY2hvaWNlcz4nICtcbiAgICAgICAgJzwvdWktc2VsZWN0PidcbiAgICAgICk7XG5cbiAgICAgIC8vIENoYW5nZSB0aGUgdWktc2VsZWN0IHRvIHVpLXNlbGVjdCBtdWx0aXBsZS5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy1tdWx0aXBsZS5odG1sJyxcbiAgICAgICAgJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignYnV0dG9uJywge1xuICAgICAgICB0aXRsZTogJ0J1dHRvbicsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvYnV0dG9uLmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnU3VibWl0JyxcbiAgICAgICAgICB0YWJsZVZpZXc6IGZhbHNlLFxuICAgICAgICAgIGtleTogJ3N1Ym1pdCcsXG4gICAgICAgICAgc2l6ZTogJ21kJyxcbiAgICAgICAgICBsZWZ0SWNvbjogJycsXG4gICAgICAgICAgcmlnaHRJY29uOiAnJyxcbiAgICAgICAgICBibG9jazogZmFsc2UsXG4gICAgICAgICAgYWN0aW9uOiAnc3VibWl0JyxcbiAgICAgICAgICBkaXNhYmxlT25JbnZhbGlkOiB0cnVlLFxuICAgICAgICAgIHRoZW1lOiAncHJpbWFyeSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKHNldHRpbmdzLCAkc2NvcGUpIHtcbiAgICAgICAgICAkc2NvcGUub25DbGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoc2V0dGluZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICBjYXNlICdyZXNldCc6XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc2V0Rm9ybSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2J1dHRvbi5odG1sJyxcbiAgICAgICAgJzxidXR0b24gdHlwZT1cInt7Y29tcG9uZW50LmFjdGlvbiA9PSBcXCdzdWJtaXRcXCcgPyBcXCdzdWJtaXRcXCcgOiBcXCdidXR0b25cXCd9fVwiJyArXG4gICAgICAgICduZy1jbGFzcz1cIntcXCdidG4tYmxvY2tcXCc6IGNvbXBvbmVudC5ibG9ja31cIicgK1xuICAgICAgICAnY2xhc3M9XCJidG4gYnRuLXt7IGNvbXBvbmVudC50aGVtZSB9fSBidG4te3sgY29tcG9uZW50LnNpemUgfX1cIicgK1xuICAgICAgICAnbmctZGlzYWJsZWQ9XCJyZWFkT25seSB8fCBmb3JtLnN1Ym1pdHRpbmcgfHwgKGNvbXBvbmVudC5kaXNhYmxlT25JbnZhbGlkICYmIGZvcm0uJGludmFsaWQpXCInICtcbiAgICAgICAgJ25nLWNsaWNrPVwib25DbGljaygpXCI+JyArXG4gICAgICAgICc8c3BhbiBuZy1pZj1cImNvbXBvbmVudC5sZWZ0SWNvblwiIGNsYXNzPVwie3sgY29tcG9uZW50LmxlZnRJY29uIH19XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPicgK1xuICAgICAgICAnPHNwYW4gbmctaWY9XCJjb21wb25lbnQubGVmdEljb24gJiYgY29tcG9uZW50LmxhYmVsXCI+Jm5ic3A7PC9zcGFuPicgK1xuICAgICAgICAne3sgY29tcG9uZW50LmxhYmVsIH19JyArXG4gICAgICAgICc8c3BhbiBuZy1pZj1cImNvbXBvbmVudC5yaWdodEljb24gJiYgY29tcG9uZW50LmxhYmVsXCI+Jm5ic3A7PC9zcGFuPicgK1xuICAgICAgICAnPHNwYW4gbmctaWY9XCJjb21wb25lbnQucmlnaHRJY29uXCIgY2xhc3M9XCJ7eyBjb21wb25lbnQucmlnaHRJY29uIH19XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPicgK1xuICAgICAgICAnIDxpIG5nLWlmPVwiY29tcG9uZW50LmFjdGlvbiA9PSBcXCdzdWJtaXRcXCcgJiYgZm9ybS5zdWJtaXR0aW5nXCIgY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2ggZ2x5cGhpY29uLXNwaW5cIj48L2k+JyArXG4gICAgICAgICc8L2J1dHRvbj4nXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjaGVja2JveCcsIHtcbiAgICAgICAgdGl0bGU6ICdDaGVjayBCb3gnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NoZWNrYm94Lmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIGlucHV0VHlwZTogJ2NoZWNrYm94JyxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgLy8gVGhpcyBoaWRlcyB0aGUgZGVmYXVsdCBsYWJlbCBsYXlvdXQgc28gd2UgY2FuIHVzZSBhIHNwZWNpYWwgaW5saW5lIGxhYmVsXG4gICAgICAgICAgaGlkZUxhYmVsOiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdjaGVja2JveEZpZWxkJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUsXG4gICAgICAgICAgICAgIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2NoZWNrYm94Lmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiY2hlY2tib3hcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9e3sgY29tcG9uZW50LmtleSB9fSBuZy1jbGFzcz1cIntcXCdmaWVsZC1yZXF1aXJlZFxcJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVwiPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XCIgJyArXG4gICAgICAgICdpZD1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiAnICtcbiAgICAgICAgJ25hbWU9XCJ7eyBjb21wb25lbnQua2V5IH19XCIgJyArXG4gICAgICAgICd2YWx1ZT1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiAnICtcbiAgICAgICAgJ25nLWRpc2FibGVkPVwicmVhZE9ubHlcIiAnICtcbiAgICAgICAgJ25nLW1vZGVsPVwiZGF0YVtjb21wb25lbnQua2V5XVwiICcgK1xuICAgICAgICAnbmctcmVxdWlyZWQ9XCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIj4nICtcbiAgICAgICAgJ3t7IGNvbXBvbmVudC5sYWJlbCB9fScgK1xuICAgICAgICAnPC9sYWJlbD4nICtcbiAgICAgICAgJzwvZGl2PidcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjb2x1bW5zJywge1xuICAgICAgICB0aXRsZTogJ0NvbHVtbnMnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgY29sdW1uczogW3tjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX1dXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicm93XCI+JyArXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLXhzLTZcIiBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29tcG9uZW50LmNvbHVtbnNcIj4nICtcbiAgICAgICAgJzxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cImNvbXBvbmVudCBpbiBjb2x1bW4uY29tcG9uZW50c1wiIG5nLWlmPVwiY29tcG9uZW50Rm91bmQoY29tcG9uZW50KVwiIGNvbXBvbmVudD1cImNvbXBvbmVudFwiIGRhdGE9XCJkYXRhXCIgZm9ybWlvPVwiZm9ybWlvXCIgcmVhZC1vbmx5PVwicmVhZE9ubHlcIj48L2Zvcm1pby1jb21wb25lbnQ+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzwvZGl2PidcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcblxuICBhcHAucHJvdmlkZXIoJ2Zvcm1pb0NvbXBvbmVudHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbXBvbmVudHMgPSB7fTtcbiAgICB2YXIgZ3JvdXBzID0ge1xuICAgICAgX19jb21wb25lbnQ6IHtcbiAgICAgICAgdGl0bGU6ICdGb3JtIENvbXBvbmVudHMnXG4gICAgICB9LFxuICAgICAgbGF5b3V0OiB7XG4gICAgICAgIHRpdGxlOiAnTGF5b3V0IENvbXBvbmVudHMnXG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgYWRkR3JvdXA6IGZ1bmN0aW9uIChuYW1lLCBncm91cCkge1xuICAgICAgICBncm91cHNbbmFtZV0gPSBncm91cDtcbiAgICAgIH0sXG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24gKHR5cGUsIGNvbXBvbmVudCwgZ3JvdXApIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnRzW3R5cGVdKSB7XG4gICAgICAgICAgY29tcG9uZW50c1t0eXBlXSA9IGNvbXBvbmVudDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhbmd1bGFyLmV4dGVuZChjb21wb25lbnRzW3R5cGVdLCBjb21wb25lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSB0eXBlIGZvciB0aGlzIGNvbXBvbmVudC5cbiAgICAgICAgaWYgKCFjb21wb25lbnRzW3R5cGVdLmdyb3VwKSB7XG4gICAgICAgICAgY29tcG9uZW50c1t0eXBlXS5ncm91cCA9IGdyb3VwIHx8ICdfX2NvbXBvbmVudCc7XG4gICAgICAgIH1cbiAgICAgICAgY29tcG9uZW50c1t0eXBlXS5zZXR0aW5ncy50eXBlID0gdHlwZTtcbiAgICAgIH0sXG4gICAgICAkZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29tcG9uZW50czogY29tcG9uZW50cyxcbiAgICAgICAgICBncm91cHM6IGdyb3Vwc1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuXG4gIGFwcC5kaXJlY3RpdmUoJ3NhZmVNdWx0aXBsZVRvU2luZ2xlJywgW2Z1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsLCBhdHRycywgbmdNb2RlbCkge1xuICAgICAgICBuZ01vZGVsLiRmb3JtYXR0ZXJzLnB1c2goZnVuY3Rpb24gKG1vZGVsVmFsdWUpIHtcbiAgICAgICAgICBpZiAoISRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgJiYgQXJyYXkuaXNBcnJheShtb2RlbFZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWVbMF0gfHwgJyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1dKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcblxuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NvbnRlbnQnLCB7XG4gICAgICAgIHRpdGxlOiAnQ29udGVudCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvY29udGVudC5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgaHRtbDogJydcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY29udGVudC5odG1sJyxcbiAgICAgICAgJzxkaXYgbmctYmluZC1odG1sPVwiY29tcG9uZW50Lmh0bWwgfCBzYWZlaHRtbFwiPjwvZGl2PidcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcblxuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2RhdGV0aW1lJywge1xuICAgICAgICB0aXRsZTogJ0RhdGUgLyBUaW1lJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9kYXRldGltZS5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2RhdGV0aW1lRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBmb3JtYXQ6ICd5eXl5LU1NLWRkIEhIOm1tJyxcbiAgICAgICAgICBlbmFibGVEYXRlOiB0cnVlLFxuICAgICAgICAgIGVuYWJsZVRpbWU6IHRydWUsXG4gICAgICAgICAgbWluRGF0ZTogbnVsbCxcbiAgICAgICAgICBtYXhEYXRlOiBudWxsLFxuICAgICAgICAgIGRhdGVwaWNrZXJNb2RlOiAnZGF5JyxcbiAgICAgICAgICBkYXRlUGlja2VyOiB7XG4gICAgICAgICAgICBzaG93V2Vla3M6IHRydWUsXG4gICAgICAgICAgICBzdGFydGluZ0RheTogMCxcbiAgICAgICAgICAgIGluaXREYXRlOiAnJyxcbiAgICAgICAgICAgIG1pbk1vZGU6ICdkYXknLFxuICAgICAgICAgICAgbWF4TW9kZTogJ3llYXInLFxuICAgICAgICAgICAgeWVhclJhbmdlOiAnMjAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aW1lUGlja2VyOiB7XG4gICAgICAgICAgICBob3VyU3RlcDogMSxcbiAgICAgICAgICAgIG1pbnV0ZVN0ZXA6IDEsXG4gICAgICAgICAgICBzaG93TWVyaWRpYW46IHRydWUsXG4gICAgICAgICAgICByZWFkb25seUlucHV0OiBmYWxzZSxcbiAgICAgICAgICAgIG1vdXNld2hlZWw6IHRydWUsXG4gICAgICAgICAgICBhcnJvd2tleXM6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgY3VzdG9tOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSwgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZGF0ZXRpbWUuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cFwiPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiAnICtcbiAgICAgICAgJ25nLWZvY3VzPVwiY2FsZW5kYXJPcGVuID0gdHJ1ZVwiICcgK1xuICAgICAgICAnbmctY2xpY2s9XCJjYWxlbmRhck9wZW4gPSB0cnVlXCIgJyArXG4gICAgICAgICduZy1pbml0PVwiY2FsZW5kYXJPcGVuID0gZmFsc2VcIiAnICtcbiAgICAgICAgJ25nLWRpc2FibGVkPVwicmVhZE9ubHlcIiAnICtcbiAgICAgICAgJ25nLXJlcXVpcmVkPVwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXCIgJyArXG4gICAgICAgICdpcy1vcGVuPVwiY2FsZW5kYXJPcGVuXCIgJyArXG4gICAgICAgICdkYXRldGltZS1waWNrZXI9XCJ7eyBjb21wb25lbnQuZm9ybWF0IH19XCIgJyArXG4gICAgICAgICdtaW4tZGF0ZT1cImNvbXBvbmVudC5taW5EYXRlXCIgJyArXG4gICAgICAgICdtYXgtZGF0ZT1cImNvbXBvbmVudC5tYXhEYXRlXCIgJyArXG4gICAgICAgICdkYXRlcGlja2VyLW1vZGU9XCJjb21wb25lbnQuZGF0ZXBpY2tlck1vZGVcIiAnICtcbiAgICAgICAgJ2VuYWJsZS1kYXRlPVwiY29tcG9uZW50LmVuYWJsZURhdGVcIiAnICtcbiAgICAgICAgJ2VuYWJsZS10aW1lPVwiY29tcG9uZW50LmVuYWJsZVRpbWVcIiAnICtcbiAgICAgICAgJ25nLW1vZGVsPVwiZGF0YVtjb21wb25lbnQua2V5XVwiICcgK1xuICAgICAgICAncGxhY2Vob2xkZXI9XCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cIiAnICtcbiAgICAgICAgJ2RhdGVwaWNrZXItb3B0aW9ucz1cImNvbXBvbmVudC5kYXRlUGlja2VyXCIgJyArXG4gICAgICAgICd0aW1lcGlja2VyLW9wdGlvbnM9XCJjb21wb25lbnQudGltZVBpY2tlclwiIC8+JyArXG4gICAgICAgICc8c3BhbiBjbGFzcz1cImlucHV0LWdyb3VwLWJ0blwiPicgK1xuICAgICAgICAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLWRlZmF1bHRcIiBuZy1jbGljaz1cImNhbGVuZGFyT3BlbiA9IHRydWVcIj4nICtcbiAgICAgICAgJzxpIG5nLWlmPVwiY29tcG9uZW50LmVuYWJsZURhdGVcIiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tY2FsZW5kYXJcIj48L2k+JyArXG4gICAgICAgICc8aSBuZy1pZj1cIiFjb21wb25lbnQuZW5hYmxlRGF0ZVwiIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi10aW1lXCI+PC9pPicgK1xuICAgICAgICAnPC9idXR0b24+JyArXG4gICAgICAgICc8L3NwYW4+JyArXG4gICAgICAgICc8L2Rpdj4nXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdlbWFpbCcsIHtcbiAgICAgICAgdGl0bGU6ICdFbWFpbCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2VtYWlsRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZmllbGRzZXQnLCB7XG4gICAgICAgIHRpdGxlOiAnRmllbGQgU2V0JyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9maWVsZHNldC5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxlZ2VuZDogJycsXG4gICAgICAgICAgY29tcG9uZW50czogW11cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZmllbGRzZXQuaHRtbCcsXG4gICAgICAgICc8ZmllbGRzZXQ+JyArXG4gICAgICAgICc8bGVnZW5kIG5nLWlmPVwiY29tcG9uZW50LmxlZ2VuZFwiPnt7IGNvbXBvbmVudC5sZWdlbmQgfX08L2xlZ2VuZD4nICtcbiAgICAgICAgJzxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1wiIG5nLWlmPVwiY29tcG9uZW50Rm91bmQoY29tcG9uZW50KVwiIGNvbXBvbmVudD1cImNvbXBvbmVudFwiIGRhdGE9XCJkYXRhXCIgZm9ybWlvPVwiZm9ybWlvXCIgcmVhZC1vbmx5PVwicmVhZE9ubHlcIj48L2Zvcm1pby1jb21wb25lbnQ+JyArXG4gICAgICAgICc8L2ZpZWxkc2V0PidcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcblxuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2hpZGRlbicsIHtcbiAgICAgICAgdGl0bGU6ICdIaWRkZW4nLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2hpZGRlbi5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAga2V5OiAnaGlkZGVuRmllbGQnLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9oaWRkZW4uaHRtbCcsXG4gICAgICAgICc8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwie3sgY29tcG9uZW50LmtleSB9fVwiIG5hbWU9XCJ7eyBjb21wb25lbnQua2V5IH19XCIgbmctbW9kZWw9XCJkYXRhW2NvbXBvbmVudC5rZXldXCI+J1xuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIid1c2Ugc3RyaWN0J1xuXG52YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2Zvcm1pbycpO1xuXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMnKShhcHApO1xucmVxdWlyZSgnLi90ZXh0ZmllbGQnKShhcHApO1xucmVxdWlyZSgnLi9hZGRyZXNzJykoYXBwKTtcbnJlcXVpcmUoJy4vYnV0dG9uJykoYXBwKTtcbnJlcXVpcmUoJy4vY2hlY2tib3gnKShhcHApO1xucmVxdWlyZSgnLi9jb2x1bW5zJykoYXBwKTtcbnJlcXVpcmUoJy4vY29udGVudCcpKGFwcCk7XG5yZXF1aXJlKCcuL2RhdGV0aW1lJykoYXBwKTtcbnJlcXVpcmUoJy4vZW1haWwnKShhcHApO1xucmVxdWlyZSgnLi9maWVsZHNldCcpKGFwcCk7XG5yZXF1aXJlKCcuL2hpZGRlbicpKGFwcCk7XG5yZXF1aXJlKCcuL251bWJlcicpKGFwcCk7XG5yZXF1aXJlKCcuL3BhZ2UnKShhcHApO1xucmVxdWlyZSgnLi9wYW5lbCcpKGFwcCk7XG5yZXF1aXJlKCcuL3Bhc3N3b3JkJykoYXBwKTtcbnJlcXVpcmUoJy4vcGhvbmVudW1iZXInKShhcHApO1xucmVxdWlyZSgnLi9yYWRpbycpKGFwcCk7XG5yZXF1aXJlKCcuL3Jlc291cmNlJykoYXBwKTtcbnJlcXVpcmUoJy4vc2VsZWN0JykoYXBwKTtcbnJlcXVpcmUoJy4vc2lnbmF0dXJlJykoYXBwKTtcbnJlcXVpcmUoJy4vdGV4dGFyZWEnKShhcHApO1xucmVxdWlyZSgnLi93ZWxsJykoYXBwKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignbnVtYmVyJywge1xuICAgICAgICB0aXRsZTogJ051bWJlcicsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvbnVtYmVyLmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdudW1iZXInLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdudW1iZXJGaWVsZCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIHByZWZpeDogJycsXG4gICAgICAgICAgc3VmZml4OiAnJyxcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxuICAgICAgICAgIHZhbGlkYXRlOiB7XG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBtaW46ICcnLFxuICAgICAgICAgICAgbWF4OiAnJyxcbiAgICAgICAgICAgIHN0ZXA6ICdhbnknLFxuICAgICAgICAgICAgaW50ZWdlcjogJycsXG4gICAgICAgICAgICBtdWx0aXBsZTogJycsXG4gICAgICAgICAgICBjdXN0b206ICcnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlLFxuICAgICAgICAgICAgICBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9udW1iZXIuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwie3sgY29tcG9uZW50LmlucHV0VHlwZSB9fVwiICcgK1xuICAgICAgICAnY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiAnICtcbiAgICAgICAgJ2lkPVwie3sgY29tcG9uZW50LmtleSB9fVwiICcgK1xuICAgICAgICAnbmFtZT1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiAnICtcbiAgICAgICAgJ25nLW1vZGVsPVwiZGF0YVtjb21wb25lbnQua2V5XVwiICcgK1xuICAgICAgICAnbmctcmVxdWlyZWQ9XCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIiAnICtcbiAgICAgICAgJ25nLWRpc2FibGVkPVwicmVhZE9ubHlcIiAnICtcbiAgICAgICAgJ3NhZmUtbXVsdGlwbGUtdG8tc2luZ2xlICcgK1xuICAgICAgICAnbWluPVwie3sgY29tcG9uZW50LnZhbGlkYXRlLm1pbiB9fVwiICcgK1xuICAgICAgICAnbWF4PVwie3sgY29tcG9uZW50LnZhbGlkYXRlLm1heCB9fVwiICcgK1xuICAgICAgICAnc3RlcD1cInt7IGNvbXBvbmVudC52YWxpZGF0ZS5zdGVwIH19XCIgJyArXG4gICAgICAgICdwbGFjZWhvbGRlcj1cInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB9fVwiICcgK1xuICAgICAgICAnY3VzdG9tLXZhbGlkYXRvcj1cImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cIiAnICtcbiAgICAgICAgJ2Zvcm1pby1pbnB1dC1tYXNrPVwie3sgY29tcG9uZW50LmlucHV0TWFzayB9fVwiPidcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYWdlJywge1xuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3BhZ2UuaHRtbCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxuICAgICAgICAgIGNvbXBvbmVudHM6IFtdXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3BhZ2UuaHRtbCcsXG4gICAgICAgICc8Zm9ybWlvLWNvbXBvbmVudCBuZy1yZXBlYXQ9XCJjb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHNcIiBuZy1pZj1cImNvbXBvbmVudEZvdW5kKGNvbXBvbmVudClcIiBjb21wb25lbnQ9XCJjb21wb25lbnRcIiBkYXRhPVwiZGF0YVwiIGZvcm1pbz1cImZvcm1pb1wiPjwvZm9ybWlvLWNvbXBvbmVudD4nXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYW5lbCcsIHtcbiAgICAgICAgdGl0bGU6ICdQYW5lbCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvcGFuZWwuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgIHRoZW1lOiAnZGVmYXVsdCcsXG4gICAgICAgICAgY29tcG9uZW50czogW11cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcGFuZWwuaHRtbCcsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicGFuZWwgcGFuZWwte3sgY29tcG9uZW50LnRoZW1lIH19XCI+JyArXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiY29tcG9uZW50LnRpdGxlXCIgY2xhc3M9XCJwYW5lbC1oZWFkaW5nXCI+PGgzIGNsYXNzPVwicGFuZWwtdGl0bGVcIj57eyBjb21wb25lbnQudGl0bGUgfX08L2gzPjwvZGl2PicgK1xuICAgICAgICAnPGRpdiBjbGFzcz1cInBhbmVsLWJvZHlcIj4nICtcbiAgICAgICAgJzxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1wiIG5nLWlmPVwiY29tcG9uZW50Rm91bmQoY29tcG9uZW50KVwiIGNvbXBvbmVudD1cImNvbXBvbmVudFwiIGRhdGE9XCJkYXRhXCIgZm9ybWlvPVwiZm9ybWlvXCIgcmVhZC1vbmx5PVwicmVhZE9ubHlcIj48L2Zvcm1pby1jb21wb25lbnQ+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzwvZGl2PidcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcblxuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3Bhc3N3b3JkJywge1xuICAgICAgICB0aXRsZTogJ1Bhc3N3b3JkJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiAnLS0tIFBST1RFQ1RFRCAtLS0nO1xuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogZmFsc2UsXG4gICAgICAgICAgaW5wdXRUeXBlOiAncGFzc3dvcmQnLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdwYXNzd29yZEZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgICBzdWZmaXg6ICcnLFxuICAgICAgICAgIHByb3RlY3RlZDogdHJ1ZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwaG9uZU51bWJlcicsIHtcbiAgICAgICAgdGl0bGU6ICdQaG9uZSBOdW1iZXInLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RleHRmaWVsZC5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgaW5wdXRNYXNrOiAnKDk5OSkgOTk5LTk5OTknLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdwaG9uZW51bWJlckZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgICBzdWZmaXg6ICcnLFxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncmFkaW8nLCB7XG4gICAgICAgIHRpdGxlOiAnUmFkaW8nLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3JhZGlvLmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdyYWRpbycsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3JhZGlvRmllbGQnLFxuICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbTogJycsXG4gICAgICAgICAgICBjdXN0b21Qcml2YXRlOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSxcbiAgICAgICAgICAgICAgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcmFkaW8uaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJyYWRpb1wiIG5nLXJlcGVhdD1cInYgaW4gY29tcG9uZW50LnZhbHVlcyB0cmFjayBieSAkaW5kZXhcIj4nICtcbiAgICAgICAgJzxsYWJlbCBjbGFzcz1cImNvbnRyb2wtbGFiZWxcIiBmb3I9XCJ2YWx1ZVwiPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XCIgJyArXG4gICAgICAgICdpZD1cInt7IHYudmFsdWUgfX1cIiAnICtcbiAgICAgICAgJ25hbWU9XCJ7eyBjb21wb25lbnQua2V5IH19XCIgJyArXG4gICAgICAgICd2YWx1ZT1cInt7IHYudmFsdWUgfX1cIiAnICtcbiAgICAgICAgJ25nLW1vZGVsPVwiZGF0YVtjb21wb25lbnQua2V5XVwiICcgK1xuICAgICAgICAnbmctcmVxdWlyZWQ9XCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIiAnICtcbiAgICAgICAgJ25nLWRpc2FibGVkPVwicmVhZE9ubHlcIicgK1xuICAgICAgICAnY3VzdG9tLXZhbGlkYXRvcj1cImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cIj4nICtcbiAgICAgICAgJ3t7IHYubGFiZWwgfX0nICtcbiAgICAgICAgJzwvbGFiZWw+JyArXG4gICAgICAgICc8L2Rpdj4nXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncmVzb3VyY2UnLCB7XG4gICAgICAgIHRpdGxlOiAnUmVzb3VyY2UnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEgPyBkYXRhLl9pZCA6ICcnO1xuICAgICAgICB9LFxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICAgIHJldHVybiAkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlID8gJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLW11bHRpcGxlLmh0bWwnIDogJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLmh0bWwnO1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoc2V0dGluZ3MsICRzY29wZSwgJGh0dHAsIEZvcm1pbykge1xuICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IFtdO1xuICAgICAgICAgIGlmIChzZXR0aW5ncy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVmYXVsdFZhbHVlID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzZXR0aW5ncy5yZXNvdXJjZSkge1xuICAgICAgICAgICAgdmFyIGZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLmZvcm1pby5wcm9qZWN0VXJsICsgJy9mb3JtLycgKyBzZXR0aW5ncy5yZXNvdXJjZSk7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG5cbiAgICAgICAgICAgIC8vIElmIHRoZXkgd2lzaCB0byBmaWx0ZXIgdGhlIHJlc3VsdHMuXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3Muc2VsZWN0RmllbGRzKSB7XG4gICAgICAgICAgICAgIHBhcmFtcy5zZWxlY3QgPSBzZXR0aW5ncy5zZWxlY3RGaWVsZHM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zZWFyY2hFeHByZXNzaW9uICYmIHNldHRpbmdzLnNlYXJjaEZpZWxkcykge1xuICAgICAgICAgICAgICB2YXIgc2VhcmNoID0gbmV3IFJlZ0V4cChzZXR0aW5ncy5zZWFyY2hFeHByZXNzaW9uKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hTdWJtaXNzaW9ucyA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgICAgIGlmICghaW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSBpbnB1dC5tYXRjaChzZWFyY2gpO1xuICAgICAgICAgICAgICAgIHZhciBzaG91bGRSZXF1ZXN0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMgJiYgbWF0Y2hlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2V0dGluZ3Muc2VhcmNoRmllbGRzLCBmdW5jdGlvbiAoZmllbGQsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobWF0Y2hlcy5sZW5ndGggPiAoaW5kZXggKyAxKSkgJiYgbWF0Y2hlc1tpbmRleCArIDFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW2ZpZWxkXSA9IG1hdGNoZXNbaW5kZXggKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgICBzaG91bGRSZXF1ZXN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRG8gbm90IHJlcXVlc3QgdW5sZXNzIHdlIGhhdmUgcGFyYW1ldGVycy5cbiAgICAgICAgICAgICAgICBpZiAoIXNob3VsZFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcblxuICAgICAgICAgICAgICAvLyBMb2FkIGFsbCBzdWJtaXNzaW9ucy5cbiAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hTdWJtaXNzaW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTG9hZCB0aGUgc3VibWlzc2lvbnMuXG4gICAgICAgICAgICBmb3JtaW8ubG9hZFN1Ym1pc3Npb25zKHtcbiAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHN1Ym1pc3Npb25zKSB7XG4gICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IHN1Ym1pc3Npb25zIHx8IFtdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAncmVzb3VyY2VGaWVsZCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIHJlc291cmNlOiAnJyxcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxuICAgICAgICAgIHRlbXBsYXRlOiAnPHNwYW4+e3sgaXRlbS5kYXRhIH19PC9zcGFuPicsXG4gICAgICAgICAgc2VsZWN0RmllbGRzOiAnJyxcbiAgICAgICAgICBzZWFyY2hFeHByZXNzaW9uOiAnJyxcbiAgICAgICAgICBzZWFyY2hGaWVsZHM6ICcnLFxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcbiAgICAgICAgICByZWZyZXNoOiBmYWxzZSxcbiAgICAgICAgICByZWZyZXNoRGVsYXk6IDAsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS5odG1sJyxcbiAgICAgICAgJzxsYWJlbCBuZy1pZj1cImNvbXBvbmVudC5sYWJlbFwiIGZvcj1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiBjbGFzcz1cImNvbnRyb2wtbGFiZWxcIiBuZy1jbGFzcz1cIntcXCdmaWVsZC1yZXF1aXJlZFxcJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+JyArXG4gICAgICAgICc8c3BhbiBuZy1pZj1cIiFjb21wb25lbnQubGFiZWwgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXCIgY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+JyArXG4gICAgICAgICc8dWktc2VsZWN0IHVpLXNlbGVjdC1yZXF1aXJlZCBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZSB1aS1zZWxlY3Qtb3Blbi1vbi1mb2N1cyBuZy1tb2RlbD1cImRhdGFbY29tcG9uZW50LmtleV1cIiBuZy1kaXNhYmxlZD1cInJlYWRPbmx5XCIgbmctcmVxdWlyZWQ9XCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIiBpZD1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiBuYW1lPVwie3sgY29tcG9uZW50LmtleSB9fVwiIHRoZW1lPVwiYm9vdHN0cmFwXCI+JyArXG4gICAgICAgICc8dWktc2VsZWN0LW1hdGNoIHBsYWNlaG9sZGVyPVwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XCI+JyArXG4gICAgICAgICc8Zm9ybWlvLXNlbGVjdC1pdGVtIHRlbXBsYXRlPVwiY29tcG9uZW50LnRlbXBsYXRlXCIgaXRlbT1cIiRpdGVtIHx8ICRzZWxlY3Quc2VsZWN0ZWRcIiBzZWxlY3Q9XCIkc2VsZWN0XCI+PC9mb3JtaW8tc2VsZWN0LWl0ZW0+JyArXG4gICAgICAgICc8L3VpLXNlbGVjdC1tYXRjaD4nICtcbiAgICAgICAgJzx1aS1zZWxlY3QtY2hvaWNlcyByZXBlYXQ9XCJpdGVtIGluIHNlbGVjdEl0ZW1zIHwgZmlsdGVyOiAkc2VsZWN0LnNlYXJjaFwiIHJlZnJlc2g9XCJyZWZyZXNoU3VibWlzc2lvbnMoJHNlbGVjdC5zZWFyY2gpXCIgcmVmcmVzaC1kZWxheT1cIjEwMDBcIj4nICtcbiAgICAgICAgJzxmb3JtaW8tc2VsZWN0LWl0ZW0gdGVtcGxhdGU9XCJjb21wb25lbnQudGVtcGxhdGVcIiBpdGVtPVwiaXRlbVwiIHNlbGVjdD1cIiRzZWxlY3RcIj48L2Zvcm1pby1zZWxlY3QtaXRlbT4nICtcbiAgICAgICAgJzwvdWktc2VsZWN0LWNob2ljZXM+JyArXG4gICAgICAgICc8L3VpLXNlbGVjdD4nICtcbiAgICAgICAgJzxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz4nXG4gICAgICApO1xuXG4gICAgICAvLyBDaGFuZ2UgdGhlIHVpLXNlbGVjdCB0byB1aS1zZWxlY3QgbXVsdGlwbGUuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLW11bHRpcGxlLmh0bWwnLFxuICAgICAgICAkdGVtcGxhdGVDYWNoZS5nZXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuXG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1NlbGVjdEl0ZW0nLCBbXG4gICAgJyRjb21waWxlJyxcbiAgICBmdW5jdGlvbiAoJGNvbXBpbGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgdGVtcGxhdGU6ICc9JyxcbiAgICAgICAgICBpdGVtOiAnPScsXG4gICAgICAgICAgc2VsZWN0OiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgICAgaWYgKHNjb3BlLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBlbGVtZW50Lmh0bWwoJGNvbXBpbGUoYW5ndWxhci5lbGVtZW50KHNjb3BlLnRlbXBsYXRlKSkoc2NvcGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICBdKTtcblxuICBhcHAuZGlyZWN0aXZlKCd1aVNlbGVjdFJlcXVpcmVkJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XG4gICAgICAgIHZhciBvbGRJc0VtcHR5ID0gbmdNb2RlbC4kaXNFbXB0eTtcbiAgICAgICAgbmdNb2RlbC4kaXNFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB8fCBvbGRJc0VtcHR5KHZhbHVlKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcblxuLy8gQSBoYWNrIHRvIGhhdmUgdWktc2VsZWN0IG9wZW4gb24gZm9jdXNcbiAgYXBwLmRpcmVjdGl2ZSgndWlTZWxlY3RPcGVuT25Gb2N1cycsIFsnJHRpbWVvdXQnLCBmdW5jdGlvbiAoJHRpbWVvdXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVxdWlyZTogJ3VpU2VsZWN0JyxcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbCwgYXR0cnMsIHVpU2VsZWN0KSB7XG4gICAgICAgIHZhciBjbG9zaW5nID0gZmFsc2U7XG5cbiAgICAgICAgYW5ndWxhci5lbGVtZW50KHVpU2VsZWN0LmZvY3Vzc2VyKS5vbignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCFjbG9zaW5nKSB7XG4gICAgICAgICAgICB1aVNlbGVjdC5hY3RpdmF0ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmVjYXVzZSB1aS1zZWxlY3QgaW1tZWRpYXRlbHkgZm9jdXNlcyB0aGUgZm9jdXNzZXIgYWZ0ZXIgY2xvc2luZ1xuICAgICAgICAvLyB3ZSBuZWVkIHRvIG5vdCByZS1hY3RpdmF0ZSBhZnRlciBjbG9zaW5nXG4gICAgICAgICRzY29wZS4kb24oJ3VpczpjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjbG9zaW5nID0gdHJ1ZTtcbiAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7IC8vIEknbSBzbyBzb3JyeVxuICAgICAgICAgICAgY2xvc2luZyA9IGZhbHNlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XSk7XG5cbi8vIENvbmZpZ3VyZSB0aGUgU2VsZWN0IGNvbXBvbmVudC5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdzZWxlY3QnLCB7XG4gICAgICAgIHRpdGxlOiAnU2VsZWN0JyxcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uICgkc2NvcGUpIHtcbiAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSA/ICdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QtbXVsdGlwbGUuaHRtbCcgOiAnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Lmh0bWwnO1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoc2V0dGluZ3MsICRzY29wZSwgJGh0dHAsIEZvcm1pbykge1xuICAgICAgICAgICRzY29wZS5ub3dyYXAgPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IFtdO1xuICAgICAgICAgIHZhciB2YWx1ZVByb3AgPSAkc2NvcGUuY29tcG9uZW50LnZhbHVlUHJvcGVydHk7XG4gICAgICAgICAgJHNjb3BlLmdldFNlbGVjdEl0ZW0gPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzZXR0aW5ncy5kYXRhU3JjID09PSAndmFsdWVzJykge1xuICAgICAgICAgICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZVByb3AgPyBpdGVtW3ZhbHVlUHJvcF0gOiBpdGVtO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoc2V0dGluZ3MubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIHNldHRpbmdzLmRlZmF1bHRWYWx1ZSA9IFtdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHN3aXRjaCAoc2V0dGluZ3MuZGF0YVNyYykge1xuICAgICAgICAgICAgY2FzZSAndmFsdWVzJzpcbiAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gc2V0dGluZ3MuZGF0YS52YWx1ZXM7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnanNvbic6XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gYW5ndWxhci5mcm9tSnNvbihzZXR0aW5ncy5kYXRhLmpzb24pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IFtdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndXJsJzpcbiAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7Y2FjaGU6IHRydWV9O1xuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGF0YS51cmwuc3Vic3RyKDAsIDEpID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5kYXRhLnVybCA9IEZvcm1pby5iYXNlVXJsICsgc2V0dGluZ3MuZGF0YS51cmw7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBEaXNhYmxlIGF1dGggZm9yIG91dGdvaW5nIHJlcXVlc3RzLlxuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGF0YS51cmwuaW5kZXhPZihGb3JtaW8uYmFzZVVybCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgIGRpc2FibGVKV1Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgUHJhZ21hOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICdDYWNoZS1Db250cm9sJzogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkaHR0cC5nZXQoc2V0dGluZ3MuZGF0YS51cmwsIG9wdGlvbnMpLnN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBkYXRhO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdzZWxlY3RGaWVsZCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHZhbHVlczogW3tcbiAgICAgICAgICAgICAgdmFsdWU6ICd2YWx1ZTEnLFxuICAgICAgICAgICAgICBsYWJlbDogJ1ZhbHVlIDEnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWU6ICd2YWx1ZTInLFxuICAgICAgICAgICAgICAgIGxhYmVsOiAnVmFsdWUgMidcbiAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBqc29uOiAnJyxcbiAgICAgICAgICAgIHVybDogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGFTcmM6ICd2YWx1ZXMnLFxuICAgICAgICAgIHZhbHVlUHJvcGVydHk6ICcnLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgdGVtcGxhdGU6ICc8c3Bhbj57eyBpdGVtLmxhYmVsIH19PC9zcGFuPicsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIHJlZnJlc2g6IGZhbHNlLFxuICAgICAgICAgIHJlZnJlc2hEZWxheTogMCxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QuaHRtbCcsXG4gICAgICAgICc8bGFiZWwgbmctaWY9XCJjb21wb25lbnQubGFiZWxcIiBmb3I9XCJ7eyBjb21wb25lbnQua2V5IH19XCIgY2xhc3M9XCJjb250cm9sLWxhYmVsXCIgbmctY2xhc3M9XCJ7XFwnZmllbGQtcmVxdWlyZWRcXCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cIj57eyBjb21wb25lbnQubGFiZWwgfX08L2xhYmVsPicgK1xuICAgICAgICAnPHNwYW4gbmctaWY9XCIhY29tcG9uZW50LmxhYmVsICYmIGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFwiIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPicgK1xuICAgICAgICAnPHVpLXNlbGVjdCB1aS1zZWxlY3QtcmVxdWlyZWQgdWktc2VsZWN0LW9wZW4tb24tZm9jdXMgbmctbW9kZWw9XCJkYXRhW2NvbXBvbmVudC5rZXldXCIgc2FmZS1tdWx0aXBsZS10by1zaW5nbGUgbmFtZT1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiBuZy1kaXNhYmxlZD1cInJlYWRPbmx5XCIgbmctcmVxdWlyZWQ9XCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIiBpZD1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiB0aGVtZT1cImJvb3RzdHJhcFwiPicgK1xuICAgICAgICAnPHVpLXNlbGVjdC1tYXRjaCBwbGFjZWhvbGRlcj1cInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB9fVwiPicgK1xuICAgICAgICAnPGZvcm1pby1zZWxlY3QtaXRlbSB0ZW1wbGF0ZT1cImNvbXBvbmVudC50ZW1wbGF0ZVwiIGl0ZW09XCIkaXRlbSB8fCAkc2VsZWN0LnNlbGVjdGVkXCIgc2VsZWN0PVwiJHNlbGVjdFwiPjwvZm9ybWlvLXNlbGVjdC1pdGVtPicgK1xuICAgICAgICAnPC91aS1zZWxlY3QtbWF0Y2g+JyArXG4gICAgICAgICc8dWktc2VsZWN0LWNob2ljZXMgcmVwZWF0PVwiZ2V0U2VsZWN0SXRlbShpdGVtKSBhcyBpdGVtIGluIHNlbGVjdEl0ZW1zIHwgZmlsdGVyOiAkc2VsZWN0LnNlYXJjaFwiPicgK1xuICAgICAgICAnPGZvcm1pby1zZWxlY3QtaXRlbSB0ZW1wbGF0ZT1cImNvbXBvbmVudC50ZW1wbGF0ZVwiIGl0ZW09XCJpdGVtXCIgc2VsZWN0PVwiJHNlbGVjdFwiPjwvZm9ybWlvLXNlbGVjdC1pdGVtPicgK1xuICAgICAgICAnPC91aS1zZWxlY3QtY2hvaWNlcz4nICtcbiAgICAgICAgJzwvdWktc2VsZWN0PicgK1xuICAgICAgICAnPGZvcm1pby1lcnJvcnM+PC9mb3JtaW8tZXJyb3JzPidcbiAgICAgICk7XG5cbiAgICAgIC8vIENoYW5nZSB0aGUgdWktc2VsZWN0IHRvIHVpLXNlbGVjdCBtdWx0aXBsZS5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0LW11bHRpcGxlLmh0bWwnLFxuICAgICAgICAkdGVtcGxhdGVDYWNoZS5nZXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdC5odG1sJykucmVwbGFjZSgnPHVpLXNlbGVjdCcsICc8dWktc2VsZWN0IG11bHRpcGxlJylcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcblxuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3NpZ25hdHVyZScsIHtcbiAgICAgICAgdGl0bGU6ICdTaWduYXR1cmUnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3NpZ25hdHVyZS5odG1sJyxcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgIHJldHVybiBkYXRhID8gJ1llcycgOiAnTm8nO1xuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAnc2lnbmF0dXJlJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgZm9vdGVyOiAnU2lnbiBhYm92ZScsXG4gICAgICAgICAgd2lkdGg6ICcxMDAlJyxcbiAgICAgICAgICBoZWlnaHQ6ICcxNTAnLFxuICAgICAgICAgIHBlbkNvbG9yOiAnYmxhY2snLFxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogJ3JnYigyNDUsMjQ1LDIzNSknLFxuICAgICAgICAgIG1pbldpZHRoOiAnMC41JyxcbiAgICAgICAgICBtYXhXaWR0aDogJzIuNScsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLmRpcmVjdGl2ZSgnc2lnbmF0dXJlJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY29tcG9uZW50OiAnPSdcbiAgICAgIH0sXG4gICAgICByZXF1aXJlOiAnP25nTW9kZWwnLFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xuICAgICAgICBpZiAoIW5nTW9kZWwpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXRzIHRoZSBsYWJlbCBvZiBjb21wb25lbnQgZm9yIGVycm9yIGRpc3BsYXkuXG4gICAgICAgIHNjb3BlLmNvbXBvbmVudC5sYWJlbCA9ICdTaWduYXR1cmUnO1xuICAgICAgICBzY29wZS5jb21wb25lbnQuaGlkZUxhYmVsID0gdHJ1ZTtcblxuICAgICAgICAvLyBTZXRzIHRoZSBkaW1lbnNpb24gb2YgYSB3aWR0aCBvciBoZWlnaHQuXG4gICAgICAgIHZhciBzZXREaW1lbnNpb24gPSBmdW5jdGlvbiAoZGltKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmNvbXBvbmVudFtkaW1dLnNsaWNlKC0xKSA9PT0gJyUnKSB7XG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9IHBhcnNlRmxvYXQoc2NvcGUuY29tcG9uZW50W2RpbV0uc2xpY2UoMCwgLTEpKSAvIDEwMDtcbiAgICAgICAgICAgIGVsZW1lbnRbMF1bZGltXSA9IGVsZW1lbnQucGFyZW50KClbZGltXSgpICogcGVyY2VudDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50WzBdW2RpbV0gPSBwYXJzZUludChzY29wZS5jb21wb25lbnRbZGltXSwgMTApO1xuICAgICAgICAgICAgc2NvcGUuY29tcG9uZW50W2RpbV0gKz0gJ3B4JztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2V0IHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSBjYW52YXMuXG4gICAgICAgIHNldERpbWVuc2lvbignd2lkdGgnKTtcbiAgICAgICAgc2V0RGltZW5zaW9uKCdoZWlnaHQnKTtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIHNpZ25hdHVyZSBwYWQuXG4gICAgICAgIC8qIGdsb2JhbCBTaWduYXR1cmVQYWQ6ZmFsc2UgKi9cbiAgICAgICAgdmFyIHNpZ25hdHVyZVBhZCA9IG5ldyBTaWduYXR1cmVQYWQoZWxlbWVudFswXSwge1xuICAgICAgICAgIG1pbldpZHRoOiBzY29wZS5jb21wb25lbnQubWluV2lkdGgsXG4gICAgICAgICAgbWF4V2lkdGg6IHNjb3BlLmNvbXBvbmVudC5tYXhXaWR0aCxcbiAgICAgICAgICBwZW5Db2xvcjogc2NvcGUuY29tcG9uZW50LnBlbkNvbG9yLFxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogc2NvcGUuY29tcG9uZW50LmJhY2tncm91bmRDb2xvclxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5wZW5Db2xvcicsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgIHNpZ25hdHVyZVBhZC5wZW5Db2xvciA9IG5ld1ZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5iYWNrZ3JvdW5kQ29sb3InLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgICBzaWduYXR1cmVQYWQuYmFja2dyb3VuZENvbG9yID0gbmV3VmFsdWU7XG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmNsZWFyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENsZWFyIHRoZSBzaWduYXR1cmUuXG4gICAgICAgIHNjb3BlLmNvbXBvbmVudC5jbGVhclNpZ25hdHVyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzaWduYXR1cmVQYWQuY2xlYXIoKTtcbiAgICAgICAgICByZWFkU2lnbmF0dXJlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2V0IHNvbWUgQ1NTIHByb3BlcnRpZXMuXG4gICAgICAgIGVsZW1lbnQuY3NzKHtcbiAgICAgICAgICAnYm9yZGVyLXJhZGl1cyc6ICc0cHgnLFxuICAgICAgICAgICdib3gtc2hhZG93JzogJzAgMCA1cHggcmdiYSgwLCAwLCAwLCAwLjAyKSBpbnNldCcsXG4gICAgICAgICAgJ2JvcmRlcic6ICcxcHggc29saWQgI2Y0ZjRmNCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVhZFNpZ25hdHVyZSgpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkICYmIHNpZ25hdHVyZVBhZC5pc0VtcHR5KCkpIHtcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZSgnJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShzaWduYXR1cmVQYWQudG9EYXRhVVJMKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG5nTW9kZWwuJHJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzaWduYXR1cmVQYWQuZnJvbURhdGFVUkwobmdNb2RlbC4kdmlld1ZhbHVlKTtcbiAgICAgICAgfTtcbiAgICAgICAgc2lnbmF0dXJlUGFkLm9uRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHNjb3BlLiRldmFsQXN5bmMocmVhZFNpZ25hdHVyZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmVhZCBpbml0aWFsIGVtcHR5IGNhbnZhcywgdW5sZXNzIHNpZ25hdHVyZSBpcyByZXF1aXJlZCwgdGhlbiBrZWVwIGl0IHByaXN0aW5lXG4gICAgICAgIGlmICghc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkKSB7XG4gICAgICAgICAgcmVhZFNpZ25hdHVyZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUsXG4gICAgICAgICAgICAgIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NpZ25hdHVyZS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICAnPGltZyBuZy1pZj1cInJlYWRPbmx5XCIgbmctYXR0ci1zcmM9XCJ7e2RhdGFbY29tcG9uZW50LmtleV19fVwiIHNyYz1cIlwiIC8+JyArXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIXJlYWRPbmx5XCIgc3R5bGU9XCJ3aWR0aDoge3sgY29tcG9uZW50LndpZHRoIH19OyBoZWlnaHQ6IHt7IGNvbXBvbmVudC5oZWlnaHQgfX07XCI+JyArXG4gICAgICAgICc8YSBjbGFzcz1cImJ0biBidG4teHMgYnRuLWRlZmF1bHRcIiBzdHlsZT1cInBvc2l0aW9uOmFic29sdXRlOyBsZWZ0OiAwOyB0b3A6IDA7IHotaW5kZXg6IDEwMDBcIiBuZy1jbGljaz1cImNvbXBvbmVudC5jbGVhclNpZ25hdHVyZSgpXCI+PHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2hcIj48L3NwYW4+PC9hPicgK1xuICAgICAgICAnPGNhbnZhcyBzaWduYXR1cmUgY29tcG9uZW50PVwiY29tcG9uZW50XCIgbmFtZT1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiBuZy1tb2RlbD1cImRhdGFbY29tcG9uZW50LmtleV1cIiBuZy1yZXF1aXJlZD1cImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFwiPjwvY2FudmFzPicgK1xuICAgICAgICAnPGRpdiBjbGFzcz1cImZvcm1pby1zaWduYXR1cmUtZm9vdGVyXCIgc3R5bGU9XCJ0ZXh0LWFsaWduOiBjZW50ZXI7Y29sb3I6I0MzQzNDMztcIiBuZy1jbGFzcz1cIntcXCdmaWVsZC1yZXF1aXJlZFxcJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVwiPnt7IGNvbXBvbmVudC5mb290ZXIgfX08L2Rpdj4nICtcbiAgICAgICAgJzwvZGl2PidcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0ZXh0YXJlYScsIHtcbiAgICAgICAgdGl0bGU6ICdUZXh0IEFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RleHRhcmVhLmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAndGV4dGFyZWFGaWVsZCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIHByZWZpeDogJycsXG4gICAgICAgICAgc3VmZml4OiAnJyxcbiAgICAgICAgICByb3dzOiAzLFxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxuICAgICAgICAgIHZhbGlkYXRlOiB7XG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBtaW5MZW5ndGg6ICcnLFxuICAgICAgICAgICAgbWF4TGVuZ3RoOiAnJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICcnLFxuICAgICAgICAgICAgY3VzdG9tOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSxcbiAgICAgICAgICAgICAgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGFyZWEuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgJzx0ZXh0YXJlYSAnICtcbiAgICAgICAgJ2NsYXNzPVwiZm9ybS1jb250cm9sXCIgJyArXG4gICAgICAgICduZy1tb2RlbD1cImRhdGFbY29tcG9uZW50LmtleV1cIiAnICtcbiAgICAgICAgJ25nLWRpc2FibGVkPVwicmVhZE9ubHlcIiAnICtcbiAgICAgICAgJ25nLXJlcXVpcmVkPVwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXCIgJyArXG4gICAgICAgICdzYWZlLW11bHRpcGxlLXRvLXNpbmdsZSAnICtcbiAgICAgICAgJ2lkPVwie3sgY29tcG9uZW50LmtleSB9fVwiICcgK1xuICAgICAgICAncGxhY2Vob2xkZXI9XCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cIiAnICtcbiAgICAgICAgJ2N1c3RvbS12YWxpZGF0b3I9XCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXCIgJyArXG4gICAgICAgICdyb3dzPVwie3sgY29tcG9uZW50LnJvd3MgfX1cIj48L3RleHRhcmVhPidcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0ZXh0ZmllbGQnLCB7XG4gICAgICAgIHRpdGxlOiAnVGV4dCBGaWVsZCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICBpbnB1dE1hc2s6ICcnLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICd0ZXh0RmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogJycsXG4gICAgICAgICAgICBtYXhMZW5ndGg6ICcnLFxuICAgICAgICAgICAgcGF0dGVybjogJycsXG4gICAgICAgICAgICBjdXN0b206ICcnLFxuICAgICAgICAgICAgY3VzdG9tUHJpdmF0ZTogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUsXG4gICAgICAgICAgICAgIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RleHRmaWVsZC5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICAnPGlucHV0IHR5cGU9XCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XCIgJyArXG4gICAgICAgICdjbGFzcz1cImZvcm0tY29udHJvbFwiICcgK1xuICAgICAgICAnaWQ9XCJ7eyBjb21wb25lbnQua2V5IH19XCIgJyArXG4gICAgICAgICduYW1lPVwie3sgY29tcG9uZW50LmtleSB9fVwiICcgK1xuICAgICAgICAnbmctZGlzYWJsZWQ9XCJyZWFkT25seVwiICcgK1xuICAgICAgICAnbmctbW9kZWw9XCJkYXRhW2NvbXBvbmVudC5rZXldXCIgJyArXG4gICAgICAgICduZy1tb2RlbC1vcHRpb25zPVwieyBkZWJvdW5jZTogNTAwIH1cIiAnICtcbiAgICAgICAgJ3NhZmUtbXVsdGlwbGUtdG8tc2luZ2xlICcgK1xuICAgICAgICAnbmctcmVxdWlyZWQ9XCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIiAnICtcbiAgICAgICAgJ25nLW1pbmxlbmd0aD1cImNvbXBvbmVudC52YWxpZGF0ZS5taW5MZW5ndGhcIiAnICtcbiAgICAgICAgJ25nLW1heGxlbmd0aD1cImNvbXBvbmVudC52YWxpZGF0ZS5tYXhMZW5ndGhcIiAnICtcbiAgICAgICAgJ2N1c3RvbS12YWxpZGF0b3I9XCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXCIgJyArXG4gICAgICAgICdwbGFjZWhvbGRlcj1cInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB9fVwiICcgK1xuICAgICAgICAnZm9ybWlvLWlucHV0LW1hc2s9XCJ7eyBjb21wb25lbnQuaW5wdXRNYXNrIH19XCI+J1xuICAgICAgKSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcblxuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3dlbGwnLCB7XG4gICAgICAgIHRpdGxlOiAnV2VsbCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvd2VsbC5odG1sJyxcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiBmYWxzZSxcbiAgICAgICAgICBjb21wb25lbnRzOiBbXVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy93ZWxsLmh0bWwnLFxuICAgICAgICAnPGRpdiBjbGFzcz1cIndlbGxcIj4nICtcbiAgICAgICAgJzxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1wiIG5nLWlmPVwiY29tcG9uZW50Rm91bmQoY29tcG9uZW50KVwiIGNvbXBvbmVudD1cImNvbXBvbmVudFwiIGRhdGE9XCJkYXRhXCIgZm9ybWlvPVwiZm9ybWlvXCIgcmVhZC1vbmx5PVwicmVhZE9ubHlcIj48L2Zvcm1pby1jb21wb25lbnQ+JyArXG4gICAgICAgICc8L2Rpdj4nXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZSwgYXR0cnMsIGN0cmwpIHtcbiAgICAgIGlmIChcbiAgICAgICAgIXNjb3BlLmNvbXBvbmVudC52YWxpZGF0ZSB8fFxuICAgICAgICAhc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGN0cmwuJHBhcnNlcnMudW5zaGlmdChmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICB2YXIgdmFsaWQgPSB0cnVlO1xuICAgICAgICBpZiAoaW5wdXQpIHtcbiAgICAgICAgICB2YXIgY3VzdG9tID0gc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbTtcbiAgICAgICAgICBjdXN0b20gPSBjdXN0b20ucmVwbGFjZSgvKHt7XFxzKyguKilcXHMrfX0pLywgZnVuY3Rpb24obWF0Y2gsICQxLCAkMikge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmRhdGFbJDJdO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8qIGpzaGludCBldmlsOiB0cnVlICovXG4gICAgICAgICAgdmFsaWQgPSBldmFsKGN1c3RvbSk7XG4gICAgICAgICAgY3RybC4kc2V0VmFsaWRpdHkoJ2N1c3RvbScsICh2YWxpZCA9PT0gdHJ1ZSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWxpZCAhPT0gdHJ1ZSkge1xuICAgICAgICAgIHNjb3BlLmNvbXBvbmVudC5jdXN0b21FcnJvciA9IHZhbGlkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodmFsaWQgPT09IHRydWUpID8gaW5wdXQgOiB2YWxpZDtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgc2NvcGU6IHtcbiAgICAgIHNyYzogJz0nLFxuICAgICAgZm9ybUFjdGlvbjogJz0nLFxuICAgICAgZm9ybTogJz0nLFxuICAgICAgc3VibWlzc2lvbjogJz0nLFxuICAgICAgcmVhZE9ubHk6ICc9J1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGh0dHAnLFxuICAgICAgJyRlbGVtZW50JyxcbiAgICAgICdGb3JtaW9TY29wZScsXG4gICAgICAnRm9ybWlvJyxcbiAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICAnZm9ybWlvQ29tcG9uZW50cycsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkaHR0cCxcbiAgICAgICAgJGVsZW1lbnQsXG4gICAgICAgIEZvcm1pb1Njb3BlLFxuICAgICAgICBGb3JtaW8sXG4gICAgICAgIEZvcm1pb1V0aWxzLFxuICAgICAgICBmb3JtaW9Db21wb25lbnRzXG4gICAgICApIHtcbiAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xuICAgICAgICAvLyBTaG93cyB0aGUgZ2l2ZW4gYWxlcnRzIChzaW5nbGUgb3IgYXJyYXkpLCBhbmQgZGlzbWlzc2VzIG9sZCBhbGVydHNcbiAgICAgICAgJHNjb3BlLnNob3dBbGVydHMgPSBmdW5jdGlvbihhbGVydHMpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIHRoZSBsaXZlIGZvcm0gcGFyYW1ldGVyIHRvIHRoZSB1cmwuXG4gICAgICAgIGlmICgkc2NvcGUuc3JjICYmICgkc2NvcGUuc3JjLmluZGV4T2YoJ2xpdmU9JykgPT09IC0xKSkge1xuICAgICAgICAgICRzY29wZS5zcmMgKz0gKCRzY29wZS5zcmMuaW5kZXhPZignPycpID09PSAtMSkgPyAnPycgOiAnJic7XG4gICAgICAgICAgJHNjb3BlLnNyYyArPSAnbGl2ZT0xJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZm9ybWlvIG9iamVjdC5cbiAgICAgICAgJHNjb3BlLmZvcm1pbyA9IEZvcm1pb1Njb3BlLnJlZ2lzdGVyKCRzY29wZSwgJGVsZW1lbnQsIHtcbiAgICAgICAgICBmb3JtOiB0cnVlLFxuICAgICAgICAgIHN1Ym1pc3Npb246IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2VlIGlmIGEgY29tcG9uZW50IGlzIGZvdW5kIGluIHRoZSByZWdpc3RyeS5cbiAgICAgICAgJHNjb3BlLmNvbXBvbmVudEZvdW5kID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50cy5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQudHlwZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ2FsbGVkIHdoZW4gdGhlIGZvcm0gaXMgc3VibWl0dGVkLlxuICAgICAgICAkc2NvcGUub25TdWJtaXQgPSBmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgaWYgKCEkc2NvcGUuZm9ybWlvRm9ybS4kdmFsaWQgfHwgZm9ybS5zdWJtaXR0aW5nKSB7IHJldHVybjsgfVxuICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IHRydWU7XG5cbiAgICAgICAgICAvLyBDcmVhdGUgYSBzYW5pdGl6ZWQgc3VibWlzc2lvbiBvYmplY3QuXG4gICAgICAgICAgdmFyIHN1Ym1pc3Npb25EYXRhID0ge2RhdGE6IHt9fTtcbiAgICAgICAgICBpZiAoJHNjb3BlLl9zdWJtaXNzaW9uLl9pZCkge1xuICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuX2lkID0gJHNjb3BlLl9zdWJtaXNzaW9uLl9pZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRzY29wZS5fc3VibWlzc2lvbi5kYXRhLl9pZCkge1xuICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuX2lkID0gJHNjb3BlLl9zdWJtaXNzaW9uLmRhdGEuX2lkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBjb21wb25lbnRzID0gRm9ybWlvVXRpbHMuZmxhdHRlbkNvbXBvbmVudHMoJHNjb3BlLl9mb3JtLmNvbXBvbmVudHMpO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuX3N1Ym1pc3Npb24uZGF0YS5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQua2V5KSkge1xuICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5kYXRhW2NvbXBvbmVudC5rZXldID0gJHNjb3BlLl9zdWJtaXNzaW9uLmRhdGFbY29tcG9uZW50LmtleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5fc3VibWlzc2lvbi5kYXRhLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgIXZhbHVlLmhhc093blByb3BlcnR5KCdfaWQnKSkge1xuICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5kYXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIENhbGxlZCB3aGVuIGEgc3VibWlzc2lvbiBoYXMgYmVlbiBtYWRlLlxuICAgICAgICAgIHZhciBvblN1Ym1pdERvbmUgPSBmdW5jdGlvbihtZXRob2QsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnU3VibWlzc2lvbiB3YXMgJyArICgobWV0aG9kID09PSAncHV0JykgPyAndXBkYXRlZCcgOiAnY3JlYXRlZCcpICsgJy4nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgZm9ybSBzdWJtaXNzaW9uLlxuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtU3VibWlzc2lvbicsIHN1Ym1pc3Npb24pO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBBbGxvdyBjdXN0b20gYWN0aW9uIHVybHMuXG4gICAgICAgICAgaWYgKCRzY29wZS5hY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBzdWJtaXNzaW9uRGF0YS5faWQgPyAncHV0JyA6ICdwb3N0JztcbiAgICAgICAgICAgICRodHRwW21ldGhvZF0oJHNjb3BlLmFjdGlvbiwgc3VibWlzc2lvbkRhdGEpLnN1Y2Nlc3MoZnVuY3Rpb24gKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgRm9ybWlvLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgICAgICAgb25TdWJtaXREb25lKG1ldGhvZCwgc3VibWlzc2lvbik7XG4gICAgICAgICAgICB9KS5lcnJvcihGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKVxuICAgICAgICAgICAgICAuZmluYWxseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgdGhleSB3aXNoIHRvIHN1Ym1pdCB0byB0aGUgZGVmYXVsdCBsb2NhdGlvbi5cbiAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuZm9ybWlvKSB7XG4gICAgICAgICAgICAkc2NvcGUuZm9ybWlvLnNhdmVTdWJtaXNzaW9uKHN1Ym1pc3Npb25EYXRhKS50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgb25TdWJtaXREb25lKHN1Ym1pc3Npb24ubWV0aG9kLCBzdWJtaXNzaW9uKTtcbiAgICAgICAgICAgIH0sIEZvcm1pb1Njb3BlLm9uRXJyb3IoJHNjb3BlLCAkZWxlbWVudCkpXG4gICAgICAgICAgICAgIC5maW5hbGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1TdWJtaXNzaW9uJywgc3VibWlzc2lvbkRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICBdLFxuICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvLmh0bWwnXG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gW1xuICAnRm9ybWlvJyxcbiAgJ2Zvcm1pb0NvbXBvbmVudHMnLFxuICBmdW5jdGlvbihcbiAgICBGb3JtaW8sXG4gICAgZm9ybWlvQ29tcG9uZW50c1xuICApIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBjb21wb25lbnQ6ICc9JyxcbiAgICAgICAgZGF0YTogJz0nLFxuICAgICAgICBmb3JtaW86ICc9JyxcbiAgICAgICAgZm9ybTogJz0nLFxuICAgICAgICByZWFkT25seTogJz0nXG4gICAgICB9LFxuICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgJyRodHRwJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICRodHRwXG4gICAgICAgICkge1xuXG4gICAgICAgICAgJHNjb3BlLnJlc2V0Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gTWFudWFsbHkgcmVtb3ZlIGVhY2gga2V5IHNvIHdlIGRvbid0IGxvc2UgYSByZWZlcmVuY2UgdG8gb3JpZ2luYWxcbiAgICAgICAgICAgIC8vIGRhdGEgaW4gY2hpbGQgc2NvcGVzLlxuICAgICAgICAgICAgZm9yKHZhciBrZXkgaW4gJHNjb3BlLmRhdGEpIHtcbiAgICAgICAgICAgICAgZGVsZXRlICRzY29wZS5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRhdGEuXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZGF0YSkge1xuICAgICAgICAgICAgJHNjb3BlLnJlc2V0Rm9ybSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIHRoaXMgY29tcG9uZW50IHJlZmVyZW5jZXMgYW4gb2JqZWN0LCB3ZSBuZWVkIHRvIGRldGVybWluZSB0aGVcbiAgICAgICAgICAvLyB2YWx1ZSBieSBuYXZpZ2F0aW5nIHRocm91Z2ggdGhlIG9iamVjdC5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50ICYmXG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LmtleVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgdmFyIHJvb3QgPSAnJztcbiAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LmtleS5pbmRleE9mKCcuJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgIHJvb3QgPSAkc2NvcGUuY29tcG9uZW50LmtleS5zcGxpdCgnLicpLnNoaWZ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgYW5ndWxhci5lcXVhbHMoe30sIGRhdGEpKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICBpZiAocm9vdCAmJiAoIWRhdGEuaGFzT3duUHJvcGVydHkocm9vdCkgfHwgYW5ndWxhci5lcXVhbHMoe30sIGRhdGFbcm9vdF0pKSkgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgaWYgKHJvb3QgJiYgZGF0YVtyb290XS5oYXNPd25Qcm9wZXJ0eSgnX2lkJykpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVtyb290ICsgJy5faWQnXSA9IGRhdGFbcm9vdF0uX2lkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IEZvcm1pby5maWVsZERhdGEoZGF0YSwgJHNjb3BlLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNlZSBpZiBhIGNvbXBvbmVudCBpcyBmb3VuZCBpbiB0aGUgcmVnaXN0cnkuXG4gICAgICAgICAgJHNjb3BlLmNvbXBvbmVudEZvdW5kID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzLmhhc093blByb3BlcnR5KGNvbXBvbmVudC50eXBlKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gR2V0IHRoZSBzZXR0aW5ncy5cbiAgICAgICAgICB2YXIgY29tcG9uZW50ID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzWyRzY29wZS5jb21wb25lbnQudHlwZV07XG4gICAgICAgICAgaWYgKCFjb21wb25lbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAvLyBTZXQgdGhlIGNvbXBvbmVudCB3aXRoIHRoZSBkZWZhdWx0cyBmcm9tIHRoZSBjb21wb25lbnQgc2V0dGluZ3MuXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5zZXR0aW5ncywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgaWYgKCEkc2NvcGUuY29tcG9uZW50Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBBZGQgYSBuZXcgZmllbGQgdmFsdWUuXG4gICAgICAgICAgJHNjb3BlLmFkZEZpZWxkVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9ICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSB8fCBbXTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XS5wdXNoKCcnKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gUmVtb3ZlIGEgZmllbGQgdmFsdWUuXG4gICAgICAgICAgJHNjb3BlLnJlbW92ZUZpZWxkVmFsdWUgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIFNldCB0aGUgdGVtcGxhdGUgZm9yIHRoZSBjb21wb25lbnQuXG4gICAgICAgICAgaWYgKHR5cGVvZiBjb21wb25lbnQudGVtcGxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9IGNvbXBvbmVudC50ZW1wbGF0ZSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9IGNvbXBvbmVudC50ZW1wbGF0ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBBbGxvdyBjb21wb25lbnQga2V5cyB0byBsb29rIGxpa2UgXCJzZXR0aW5nc1t1c2VybmFtZV1cIlxuICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LmtleSAmJiAkc2NvcGUuY29tcG9uZW50LmtleS5pbmRleE9mKCdbJykgIT09IC0xKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlcyA9ICRzY29wZS5jb21wb25lbnQua2V5Lm1hdGNoKC8oW15cXFtdKylcXFsoW15dKylcXF0vKTtcbiAgICAgICAgICAgIGlmICgobWF0Y2hlcy5sZW5ndGggPT09IDMpICYmICRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KG1hdGNoZXNbMV0pKSB7XG4gICAgICAgICAgICAgICRzY29wZS5kYXRhID0gJHNjb3BlLmRhdGFbbWF0Y2hlc1sxXV07XG4gICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnQua2V5ID0gbWF0Y2hlc1syXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBhIGNvbnRyb2xsZXIuXG4gICAgICAgICAgaWYgKGNvbXBvbmVudC5jb250cm9sbGVyKSB7XG4gICAgICAgICAgICBjb21wb25lbnQuY29udHJvbGxlcigkc2NvcGUuY29tcG9uZW50LCAkc2NvcGUsICRodHRwLCBGb3JtaW8pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEVzdGFibGlzaCBhIGRlZmF1bHQgZm9yIGRhdGEuXG4gICAgICAgICAgaWYgKCRzY29wZS5kYXRhICYmICEkc2NvcGUuZGF0YS5oYXNPd25Qcm9wZXJ0eSgkc2NvcGUuY29tcG9uZW50LmtleSkgJiYgJHNjb3BlLmNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdFZhbHVlJykpIHtcbiAgICAgICAgICAgIGlmKCRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgJiYgIWFuZ3VsYXIuaXNBcnJheSgkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gWyRzY29wZS5jb21wb25lbnQuZGVmYXVsdFZhbHVlXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuICB9XG5dO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJGNvbXBpbGUnLFxuICAnJHRlbXBsYXRlQ2FjaGUnLFxuICBmdW5jdGlvbihcbiAgICAkY29tcGlsZSxcbiAgICAkdGVtcGxhdGVDYWNoZVxuICApIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aCgkY29tcGlsZSgkdGVtcGxhdGVDYWNoZS5nZXQoc2NvcGUudGVtcGxhdGUpKShzY29wZSkpO1xuICAgICAgfSxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBUaGlzIGlzIHJlcXVpcmVkIGZvciBzb21lIHJlYXNvbiBhcyBpdCB3aWxsIG9jY2FzaW9uYWxseSB0aHJvdyBhbiBlcnJvciB3aXRob3V0IGl0LlxuICAgICAgfVxuICAgIH07XG4gIH1cbl07XG4iLCIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZTogZmFsc2UsXG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9lcnJvcnMuaHRtbCdcbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgIGlmIChhdHRycy5mb3JtaW9JbnB1dE1hc2spIHtcbiAgICAgICAgZWxlbWVudC5tYXNrKGF0dHJzLmZvcm1pb0lucHV0TWFzayk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICBzY29wZToge1xuICAgICAgc3JjOiAnPScsXG4gICAgICBmb3JtOiAnPScsXG4gICAgICBzdWJtaXNzaW9uczogJz0nLFxuICAgICAgcGVyUGFnZTogJz0nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9zdWJtaXNzaW9ucy5odG1sJyxcbiAgICBjb250cm9sbGVyOiBbXG4gICAgICAnJHNjb3BlJyxcbiAgICAgICckZWxlbWVudCcsXG4gICAgICAnRm9ybWlvU2NvcGUnLFxuICAgICAgZnVuY3Rpb24oXG4gICAgICAgICRzY29wZSxcbiAgICAgICAgJGVsZW1lbnQsXG4gICAgICAgIEZvcm1pb1Njb3BlXG4gICAgICApIHtcbiAgICAgICAgJHNjb3BlLmZvcm1pbyA9IEZvcm1pb1Njb3BlLnJlZ2lzdGVyKCRzY29wZSwgJGVsZW1lbnQsIHtcbiAgICAgICAgICBmb3JtOiB0cnVlLFxuICAgICAgICAgIHN1Ym1pc3Npb25zOiBmYWxzZVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUudGFibGVWaWV3ID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgcmV0dXJuICFjb21wb25lbnQuaGFzT3duUHJvcGVydHkoJ3RhYmxlVmlldycpIHx8IGNvbXBvbmVudC50YWJsZVZpZXc7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnX3N1Ym1pc3Npb25zJywgZnVuY3Rpb24oc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICBpZiAoc3VibWlzc2lvbnMgJiYgc3VibWlzc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsICRzY29wZS5fc3VibWlzc2lvbnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgXVxuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJ0Zvcm1pbycsXG4gICdmb3JtaW9Db21wb25lbnRzJyxcbiAgZnVuY3Rpb24oXG4gICAgRm9ybWlvLFxuICAgIGZvcm1pb0NvbXBvbmVudHNcbiAgKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdWYWxpZGF0aW9uRXJyb3InKSB7XG4gICAgICAgICAgICAkZWxlbWVudC5maW5kKCcjZm9ybS1ncm91cC0nICsgZXJyb3IuZGV0YWlsc1swXS5wYXRoKS5hZGRDbGFzcygnaGFzLWVycm9yJyk7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICdWYWxpZGF0aW9uRXJyb3I6ICcgKyBlcnJvci5kZXRhaWxzWzBdLm1lc3NhZ2U7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUVycm9yJywgZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBsb2FkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUuX2Zvcm0gPSAkc2NvcGUuZm9ybSB8fCB7fTtcbiAgICAgICAgJHNjb3BlLl9zdWJtaXNzaW9uID0gJHNjb3BlLnN1Ym1pc3Npb24gfHwge2RhdGE6IHt9fTtcbiAgICAgICAgJHNjb3BlLl9zdWJtaXNzaW9ucyA9ICRzY29wZS5zdWJtaXNzaW9ucyB8fCBbXTtcblxuICAgICAgICAvLyBVc2VkIHRvIHNldCB0aGUgZm9ybSBhY3Rpb24uXG4gICAgICAgIHZhciBnZXRBY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICBpZiAoIWFjdGlvbikgeyByZXR1cm4gJyc7IH1cbiAgICAgICAgICBpZiAoJHNjb3BlLmFjdGlvbikgeyByZXR1cm4gJyc7IH1cbiAgICAgICAgICBpZiAoYWN0aW9uLnN1YnN0cigwLCAxKSA9PT0gJy8nKSB7XG4gICAgICAgICAgICBhY3Rpb24gPSBGb3JtaW8uYmFzZVVybCArIGFjdGlvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTZXQgdGhlIGFjdGlvbi5cbiAgICAgICAgJHNjb3BlLmFjdGlvbiA9IGdldEFjdGlvbigkc2NvcGUuZm9ybUFjdGlvbik7XG5cbiAgICAgICAgLy8gQWxsb3cgc3ViIGNvbXBvbmVudHMgdGhlIGFiaWxpdHkgdG8gYWRkIG5ldyBmb3JtIGNvbXBvbmVudHMgdG8gdGhlIGZvcm0uXG4gICAgICAgIHZhciBhZGRlZERhdGEgPSB7fTtcbiAgICAgICAgJHNjb3BlLiRvbignYWRkRm9ybUNvbXBvbmVudCcsIGZ1bmN0aW9uKGV2ZW50LCBjb21wb25lbnQpIHtcbiAgICAgICAgICBpZiAoIWFkZGVkRGF0YS5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQuc2V0dGluZ3Mua2V5KSkge1xuICAgICAgICAgICAgYWRkZWREYXRhW2NvbXBvbmVudC5zZXR0aW5ncy5rZXldID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0Q29tcG9uZW50ID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXTtcbiAgICAgICAgICAgICRzY29wZS5fZm9ybS5jb21wb25lbnRzLnB1c2goYW5ndWxhci5leHRlbmQoZGVmYXVsdENvbXBvbmVudC5zZXR0aW5ncywgY29tcG9uZW50LnNldHRpbmdzKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIGFjdGlvbiBpZiB0aGV5IHByb3ZpZGVkIGl0IGluIHRoZSBmb3JtLlxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdmb3JtLmFjdGlvbicsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgeyByZXR1cm47IH1cbiAgICAgICAgICB2YXIgYWN0aW9uID0gZ2V0QWN0aW9uKHZhbHVlKTtcbiAgICAgICAgICBpZiAoYWN0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuYWN0aW9uID0gYWN0aW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSB2YWx1ZSBhbmQgc2V0IHRoZSBzY29wZSBmb3IgdGhlIG1vZGVsIGlucHV0LlxuICAgICAgICAkc2NvcGUuZmllbGREYXRhID0gZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50KSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gRm9ybWlvLmZpZWxkRGF0YShkYXRhLCBjb21wb25lbnQpO1xuICAgICAgICAgIHZhciBjb21wb25lbnRJbmZvID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXTtcbiAgICAgICAgICBpZiAoIWNvbXBvbmVudEluZm8udGFibGVWaWV3KSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICAgIGlmIChjb21wb25lbnQubXVsdGlwbGUgJiYgKHZhbHVlLmxlbmd0aCA+IDApKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godmFsdWUsIGZ1bmN0aW9uKGFycmF5VmFsdWUpIHtcbiAgICAgICAgICAgICAgdmFsdWVzLnB1c2goY29tcG9uZW50SW5mby50YWJsZVZpZXcoYXJyYXlWYWx1ZSwgY29tcG9uZW50KSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjb21wb25lbnRJbmZvLnRhYmxlVmlldyh2YWx1ZSwgY29tcG9uZW50KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc3Bpbm5lciA9ICRlbGVtZW50LmZpbmQoJyNmb3JtaW8tbG9hZGluZycpO1xuXG4gICAgICAgIGlmICgkc2NvcGUuc3JjKSB7XG4gICAgICAgICAgbG9hZGVyID0gbmV3IEZvcm1pbygkc2NvcGUuc3JjKTtcbiAgICAgICAgICBpZiAob3B0aW9ucy5mb3JtKSB7XG4gICAgICAgICAgICBzcGlubmVyLnNob3coKTtcbiAgICAgICAgICAgIGxvYWRlci5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICAgICAkc2NvcGUuX2Zvcm0gPSBmb3JtO1xuICAgICAgICAgICAgICBzcGlubmVyLmhpZGUoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtTG9hZCcsIGZvcm0pO1xuICAgICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0aW9ucy5zdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICBzcGlubmVyLnNob3coKTtcbiAgICAgICAgICAgIGxvYWRlci5sb2FkU3VibWlzc2lvbigpLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAkc2NvcGUuX3N1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICBpZiAoISRzY29wZS5fc3VibWlzc2lvbi5kYXRhKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLl9zdWJtaXNzaW9uLmRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzcGlubmVyLmhpZGUoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsIHN1Ym1pc3Npb24pO1xuICAgICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0aW9ucy5zdWJtaXNzaW9ucykge1xuICAgICAgICAgICAgc3Bpbm5lci5zaG93KCk7XG4gICAgICAgICAgICBsb2FkZXIubG9hZFN1Ym1pc3Npb25zKCkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9ucykge1xuICAgICAgICAgICAgICAkc2NvcGUuX3N1Ym1pc3Npb25zID0gc3VibWlzc2lvbnM7XG4gICAgICAgICAgICAgIHNwaW5uZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25zTG9hZCcsIHN1Ym1pc3Npb25zKTtcbiAgICAgICAgICAgIH0sIHRoaXMub25FcnJvcigkc2NvcGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG5cbiAgICAgICAgICAkc2NvcGUuZm9ybW9Mb2FkZWQgPSB0cnVlO1xuICAgICAgICAgIHNwaW5uZXIuaGlkZSgpO1xuXG4gICAgICAgICAgLy8gRW1pdCB0aGUgZXZlbnRzIGlmIHRoZXNlIG9iamVjdHMgYXJlIGFscmVhZHkgbG9hZGVkLlxuICAgICAgICAgIGlmICgkc2NvcGUuX2Zvcm0pIHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUxvYWQnLCAkc2NvcGUuX2Zvcm0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJHNjb3BlLl9zdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25Mb2FkJywgJHNjb3BlLl9zdWJtaXNzaW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRzY29wZS5fc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbnNMb2FkJywgJHNjb3BlLl9zdWJtaXNzaW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBsb2FkZXIuXG4gICAgICAgIHJldHVybiBsb2FkZXI7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIGZsYXR0ZW5Db21wb25lbnRzOiBmdW5jdGlvbiBmbGF0dGVuKGNvbXBvbmVudHMsIGZsYXR0ZW5lZCkge1xuICAgICAgZmxhdHRlbmVkID0gZmxhdHRlbmVkIHx8IHt9O1xuICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICBpZiAoY29tcG9uZW50LnRyZWUpIHtcbiAgICAgICAgICBmbGF0dGVuZWRbY29tcG9uZW50LmtleV0gPSBjb21wb25lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY29tcG9uZW50LmNvbHVtbnMgJiYgKGNvbXBvbmVudC5jb2x1bW5zLmxlbmd0aCA+IDApKSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb2x1bW5zLCBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgICAgIGZsYXR0ZW4oY29sdW1uLmNvbXBvbmVudHMsIGZsYXR0ZW5lZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudHMgJiYgKGNvbXBvbmVudC5jb21wb25lbnRzLmxlbmd0aCA+IDApKSB7XG4gICAgICAgICAgZmxhdHRlbihjb21wb25lbnQuY29tcG9uZW50cywgZmxhdHRlbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjb21wb25lbnQuaW5wdXQpIHtcbiAgICAgICAgICBmbGF0dGVuZWRbY29tcG9uZW50LmtleV0gPSBjb21wb25lbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZsYXR0ZW5lZDtcbiAgICB9LFxuICAgIGVhY2hDb21wb25lbnQ6IGZ1bmN0aW9uIGVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZm4pIHtcbiAgICAgIGlmKCFjb21wb25lbnRzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKGNvbXBvbmVudC5jb2x1bW5zKSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb2x1bW5zLCBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgICAgIGVhY2hDb21wb25lbnQoY29sdW1uLmNvbXBvbmVudHMsIGZuKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjb21wb25lbnQuY29tcG9uZW50cykge1xuICAgICAgICAgIGVhY2hDb21wb25lbnQoY29tcG9uZW50LmNvbXBvbmVudHMsIGZuKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBmbihjb21wb25lbnQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGZpZWxkV3JhcDogZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIGlucHV0ID0gaW5wdXQgKyAnPGZvcm1pby1lcnJvcnM+PC9mb3JtaW8tZXJyb3JzPic7XG4gICAgICB2YXIgbXVsdGlJbnB1dCA9IGlucHV0LnJlcGxhY2UoJ2RhdGFbY29tcG9uZW50LmtleV0nLCAnZGF0YVtjb21wb25lbnQua2V5XVskaW5kZXhdJyk7XG4gICAgICB2YXIgaW5wdXRMYWJlbCA9ICc8bGFiZWwgbmctaWY9XCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcIiBmb3I9XCJ7eyBjb21wb25lbnQua2V5IH19XCIgY2xhc3M9XCJjb250cm9sLWxhYmVsXCIgbmctY2xhc3M9XCJ7XFwnZmllbGQtcmVxdWlyZWRcXCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cIj57eyBjb21wb25lbnQubGFiZWwgfX08L2xhYmVsPic7XG4gICAgICB2YXIgcmVxdWlyZWRJbmxpbmUgPSAnPHNwYW4gbmctaWY9XCIhY29tcG9uZW50LmxhYmVsICYmIGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFwiIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPic7XG4gICAgICB2YXIgdGVtcGxhdGUgPVxuICAgICAgICAnPGRpdiBuZy1pZj1cIiFjb21wb25lbnQubXVsdGlwbGVcIj4nICtcbiAgICAgICAgaW5wdXRMYWJlbCArIHJlcXVpcmVkSW5saW5lICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cFwiIG5nLWlmPVwiY29tcG9uZW50LnByZWZpeCB8fCBjb21wb25lbnQuc3VmZml4XCI+JyArXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb25cIiBuZy1pZj1cIiEhY29tcG9uZW50LnByZWZpeFwiPnt7IGNvbXBvbmVudC5wcmVmaXggfX08L2Rpdj4nICtcbiAgICAgICAgaW5wdXQgK1xuICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgbmctaWY9XCIhY29tcG9uZW50LnByZWZpeCAmJiAhY29tcG9uZW50LnN1ZmZpeFwiPicgKyBpbnB1dCArICc8L2Rpdj4nICtcbiAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAnPGRpdiBuZy1pZj1cImNvbXBvbmVudC5tdWx0aXBsZVwiPjx0YWJsZSBjbGFzcz1cInRhYmxlIHRhYmxlLWJvcmRlcmVkXCI+JyArXG4gICAgICAgIGlucHV0TGFiZWwgK1xuICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInZhbHVlIGluIGRhdGFbY29tcG9uZW50LmtleV0gdHJhY2sgYnkgJGluZGV4XCI+JyArXG4gICAgICAgICc8dGQ+JyArIHJlcXVpcmVkSW5saW5lICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cFwiIG5nLWlmPVwiY29tcG9uZW50LnByZWZpeCB8fCBjb21wb25lbnQuc3VmZml4XCI+JyArXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb25cIiBuZy1pZj1cIiEhY29tcG9uZW50LnByZWZpeFwiPnt7IGNvbXBvbmVudC5wcmVmaXggfX08L2Rpdj4nICtcbiAgICAgICAgbXVsdGlJbnB1dCArXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb25cIiBuZy1pZj1cIiEhY29tcG9uZW50LnN1ZmZpeFwiPnt7IGNvbXBvbmVudC5zdWZmaXggfX08L2Rpdj4nICtcbiAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAnPGRpdiBuZy1pZj1cIiFjb21wb25lbnQucHJlZml4ICYmICFjb21wb25lbnQuc3VmZml4XCI+JyArIG11bHRpSW5wdXQgKyAnPC9kaXY+JyArXG4gICAgICAgICc8L3RkPicgK1xuICAgICAgICAnPHRkPjxhIG5nLWNsaWNrPVwicmVtb3ZlRmllbGRWYWx1ZSgkaW5kZXgpXCIgY2xhc3M9XCJidG4gYnRuLWRhbmdlclwiPjxzcGFuIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUtY2lyY2xlXCI+PC9zcGFuPjwvYT48L3RkPicgK1xuICAgICAgICAnPC90cj4nICtcbiAgICAgICAgJzx0cj4nICtcbiAgICAgICAgJzx0ZCBjb2xzcGFuPVwiMlwiPjxhIG5nLWNsaWNrPVwiYWRkRmllbGRWYWx1ZSgpXCIgY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIj48c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tcGx1c1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj4gQWRkIGFub3RoZXI8L2E+PC90ZD4nICtcbiAgICAgICAgJzwvdHI+JyArXG4gICAgICAgICc8L3RhYmxlPjwvZGl2Pic7XG4gICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfVxuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJyRxJyxcbiAgZnVuY3Rpb24oJHEpIHtcbiAgICB2YXIgSW50ZXJjZXB0b3IgPSB7XG4gICAgICB0b2tlbjogJycsXG4gICAgICBzZXRUb2tlbjogZnVuY3Rpb24odG9rZW4pIHtcbiAgICAgICAgdG9rZW4gPSB0b2tlbiB8fCAnJztcbiAgICAgICAgaWYgKHRva2VuID09PSB0aGlzLnRva2VuKSB7IHJldHVybjsgfVxuICAgICAgICB0aGlzLnRva2VuID0gdG9rZW47XG4gICAgICAgIGlmICghdG9rZW4pIHtcbiAgICAgICAgICB0aGlzLnNldFVzZXIobnVsbCk7XG4gICAgICAgICAgcmV0dXJuIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9Ub2tlbicpO1xuICAgICAgICB9XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdmb3JtaW9Ub2tlbicsIHRva2VuKTtcbiAgICAgIH0sXG4gICAgICBnZXRUb2tlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnRva2VuKSB7IHJldHVybiB0aGlzLnRva2VuOyB9XG4gICAgICAgIHZhciB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Ub2tlbicpIHx8ICcnO1xuICAgICAgICB0aGlzLnRva2VuID0gdG9rZW47XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgIH0sXG4gICAgICBzZXRVc2VyOiBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgIGlmICghdXNlcikge1xuICAgICAgICAgIHRoaXMuc2V0VG9rZW4obnVsbCk7XG4gICAgICAgICAgcmV0dXJuIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9Vc2VyJyk7XG4gICAgICAgIH1cbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb1VzZXInLCBhbmd1bGFyLnRvSnNvbih1c2VyKSk7XG4gICAgICB9LFxuICAgICAgZ2V0VXNlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvVXNlcicpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXQgdGhlIEpXVCB0b2tlbiB3aXRoaW4gdGhlIHJlcXVlc3QuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb24odGhpczp7dG9rZW46IHN0cmluZywgc2V0VG9rZW46IEZ1bmN0aW9uLCBnZXRUb2tlbjogRnVuY3Rpb259KX1cbiAgICAgKi9cbiAgICBJbnRlcmNlcHRvci5yZXNwb25zZSA9IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgcmVzcG9uc2VDb2RlID0gcGFyc2VJbnQocmVzcG9uc2Uuc3RhdHVzLCAxMCk7XG4gICAgICB2YXIgdG9rZW4gPSByZXNwb25zZS5oZWFkZXJzKCd4LWp3dC10b2tlbicpO1xuICAgICAgaWYgKHJlc3BvbnNlQ29kZSA9PT0gMjAwICYmIHRva2VuICYmIHRva2VuICE9PSAnJykge1xuICAgICAgICB0aGlzLnNldFRva2VuKHRva2VuKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHJlc3BvbnNlQ29kZSA9PT0gMjA0ICYmIHRva2VuICYmIHRva2VuID09PSAnJykge1xuICAgICAgICB0aGlzLnNldFRva2VuKHRva2VuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9LmJpbmQoSW50ZXJjZXB0b3IpO1xuXG4gICAgLyoqXG4gICAgICogSW50ZXJjZXB0IGEgcmVzcG9uc2UgZXJyb3IuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb24odGhpczp7dG9rZW46IHN0cmluZywgc2V0VG9rZW46IEZ1bmN0aW9uLCBnZXRUb2tlbjogRnVuY3Rpb24sIHNldFVzZXI6IEZ1bmN0aW9uLCBnZXRVc2VyOiBGdW5jdGlvbn0pfVxuICAgICAqL1xuICAgIEludGVyY2VwdG9yLnJlc3BvbnNlRXJyb3IgPSBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgaWYgKHBhcnNlSW50KHJlc3BvbnNlLnN0YXR1cywgMTApID09PSA0NDApIHtcbiAgICAgICAgcmVzcG9uc2UubG9nZ2VkT3V0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZXRUb2tlbihudWxsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgIH0uYmluZChJbnRlcmNlcHRvcik7XG5cbiAgICAvKipcbiAgICAgKiBTZXQgdGhlIHRva2VuIGluIHRoZSByZXF1ZXN0IGhlYWRlcnMuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb24odGhpczp7dG9rZW46IHN0cmluZywgc2V0VG9rZW46IEZ1bmN0aW9uLCBnZXRUb2tlbjogRnVuY3Rpb259KX1cbiAgICAgKi9cbiAgICBJbnRlcmNlcHRvci5yZXF1ZXN0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICBpZiAoY29uZmlnLmRpc2FibGVKV1QpIHsgcmV0dXJuIGNvbmZpZzsgfVxuICAgICAgdmFyIHRva2VuID0gdGhpcy5nZXRUb2tlbigpO1xuICAgICAgaWYgKHRva2VuKSB7IGNvbmZpZy5oZWFkZXJzWyd4LWp3dC10b2tlbiddID0gdG9rZW47IH1cbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfS5iaW5kKEludGVyY2VwdG9yKTtcbiAgICByZXR1cm4gSW50ZXJjZXB0b3I7XG4gIH1cbl07XG4iLCIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdGb3JtaW9VdGlscycsXG4gIGZ1bmN0aW9uKEZvcm1pb1V0aWxzKSB7XG4gICAgcmV0dXJuIEZvcm1pb1V0aWxzLmZsYXR0ZW5Db21wb25lbnRzO1xuICB9XG5dO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJHNjZScsXG4gIGZ1bmN0aW9uKFxuICAgICRzY2VcbiAgKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sKGh0bWwpO1xuICAgIH07XG4gIH1cbl07XG4iLCJ2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2Zvcm1pbycsIFtcbiAgJ25nU2FuaXRpemUnLFxuICAndWkuYm9vdHN0cmFwJyxcbiAgJ3VpLmJvb3RzdHJhcC5kYXRldGltZXBpY2tlcicsXG4gICd1aS5zZWxlY3QnLFxuICAnYW5ndWxhck1vbWVudCcsXG4gICdiZ2YucGFnaW5hdGVBbnl0aGluZydcbl0pO1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZm9ybWlvIHByb3ZpZGVyLlxuICovXG5hcHAucHJvdmlkZXIoJ0Zvcm1pbycsIHJlcXVpcmUoJy4vcHJvdmlkZXJzL0Zvcm1pbycpKTtcblxuLyoqXG4gKiBQcm92aWRlcyBhIHdheSB0byByZWdzaXRlciB0aGUgRm9ybWlvIHNjb3BlLlxuICovXG5hcHAuZmFjdG9yeSgnRm9ybWlvU2NvcGUnLCByZXF1aXJlKCcuL2ZhY3Rvcmllcy9Gb3JtaW9TY29wZScpKTtcblxuYXBwLmZhY3RvcnkoJ0Zvcm1pb1V0aWxzJywgcmVxdWlyZSgnLi9mYWN0b3JpZXMvRm9ybWlvVXRpbHMnKSk7XG5cbmFwcC5mYWN0b3J5KCdmb3JtaW9JbnRlcmNlcHRvcicsIHJlcXVpcmUoJy4vZmFjdG9yaWVzL2Zvcm1pb0ludGVyY2VwdG9yJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW8nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9EZWxldGUnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9FcnJvcnMnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvRXJyb3JzJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdjdXN0b21WYWxpZGF0b3InLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvY3VzdG9tVmFsaWRhdG9yJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9TdWJtaXNzaW9ucycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9TdWJtaXNzaW9ucycpKTtcblxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvQ29tcG9uZW50JywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudCcpKTtcblxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvRWxlbWVudCcsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9FbGVtZW50JykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9JbnB1dE1hc2snLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvSW5wdXRNYXNrJykpO1xuXG4vKipcbiAqIEZpbHRlciB0byBmbGF0dGVuIGZvcm0gY29tcG9uZW50cy5cbiAqL1xuYXBwLmZpbHRlcignZmxhdHRlbkNvbXBvbmVudHMnLCByZXF1aXJlKCcuL2ZpbHRlcnMvZmxhdHRlbkNvbXBvbmVudHMnKSk7XG5cbmFwcC5maWx0ZXIoJ3NhZmVodG1sJywgcmVxdWlyZSgnLi9maWx0ZXJzL3NhZmVodG1sJykpO1xuXG5hcHAuY29uZmlnKFtcbiAgJyRodHRwUHJvdmlkZXInLFxuICBmdW5jdGlvbihcbiAgICAkaHR0cFByb3ZpZGVyXG4gICkge1xuICAgIGlmICghJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCkge1xuICAgICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCA9IHt9O1xuICAgIH1cblxuICAgIC8vIERpc2FibGUgSUUgY2FjaGluZyBmb3IgR0VUIHJlcXVlc3RzLlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXRbJ0NhY2hlLUNvbnRyb2wnXSA9ICduby1jYWNoZSc7XG4gICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldC5QcmFnbWEgPSAnbm8tY2FjaGUnO1xuICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ2Zvcm1pb0ludGVyY2VwdG9yJyk7XG4gIH1cbl0pO1xuXG5hcHAucnVuKFtcbiAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcblxuICAgIC8vIFRoZSB0ZW1wbGF0ZSBmb3IgdGhlIGZvcm1pbyBmb3Jtcy5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby5odG1sJyxcbiAgICAgICc8Zm9ybSByb2xlPVwiZm9ybVwiIG5hbWU9XCJmb3JtaW9Gb3JtXCIgbmctc3VibWl0PVwib25TdWJtaXQoZm9ybWlvRm9ybSlcIiBub3ZhbGlkYXRlPicgK1xuICAgICAgICAnPGkgaWQ9XCJmb3JtaW8tbG9hZGluZ1wiIHN0eWxlPVwiZm9udC1zaXplOiAyZW07XCIgY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2ggZ2x5cGhpY29uLXNwaW5cIj48L2k+JyArXG4gICAgICAgICc8ZGl2IG5nLXJlcGVhdD1cImFsZXJ0IGluIGZvcm1pb0FsZXJ0c1wiIGNsYXNzPVwiYWxlcnQgYWxlcnQte3sgYWxlcnQudHlwZSB9fVwiIHJvbGU9XCJhbGVydFwiPicgK1xuICAgICAgICAgICd7eyBhbGVydC5tZXNzYWdlIH19JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cImNvbXBvbmVudCBpbiBfZm9ybS5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFwiIG5nLWlmPVwiY29tcG9uZW50Rm91bmQoY29tcG9uZW50KVwiIGNvbXBvbmVudD1cImNvbXBvbmVudFwiIGRhdGE9XCJfc3VibWlzc2lvbi5kYXRhXCIgZm9ybT1cImZvcm1pb0Zvcm1cIiBmb3JtaW89XCJmb3JtaW9cIiByZWFkLW9ubHk9XCJyZWFkT25seVwiPjwvZm9ybWlvLWNvbXBvbmVudD4nICtcbiAgICAgICc8L2Zvcm0+J1xuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1kZWxldGUuaHRtbCcsICcnICtcbiAgICAgICc8Zm9ybSByb2xlPVwiZm9ybVwiPicgK1xuICAgICAgICAnPGRpdiBuZy1yZXBlYXQ9XCJhbGVydCBpbiBmb3JtaW9BbGVydHNcIiBjbGFzcz1cImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cIiByb2xlPVwiYWxlcnRcIj4nICtcbiAgICAgICAgICAne3sgYWxlcnQubWVzc2FnZSB9fScgK1xuICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICc8aDM+QXJlIHlvdSBzdXJlIHlvdSB3aXNoIHRvIGRlbGV0ZSB0aGUge3sgcmVzb3VyY2VOYW1lIHx8IF9yZXNvdXJjZU5hbWUgfX0/PC9oMz4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJidG4tdG9vbGJhclwiPicgK1xuICAgICAgICAgICc8YnV0dG9uIG5nLWNsaWNrPVwib25EZWxldGUoKVwiIGNsYXNzPVwiYnRuIGJ0bi1kYW5nZXJcIj5ZZXM8L2J1dHRvbj4nICtcbiAgICAgICAgICAnPGJ1dHRvbiBuZy1jbGljaz1cIm9uQ2FuY2VsKClcIiBjbGFzcz1cImJ0biBidG4tZGVmYXVsdFwiPk5vPC9idXR0b24+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICc8L2Zvcm0+J1xuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9wYWdlci5odG1sJyxcbiAgICAgICc8ZGl2IGNsYXNzPVwicGFnaW5hdGUtYW55dGhpbmdcIj4nICtcbiAgICAgICAgJzx1bCBjbGFzcz1cInBhZ2luYXRpb24gcGFnaW5hdGlvbi17e3NpemV9fSBsaW5rc1wiIG5nLWlmPVwibnVtUGFnZXMgPiAxXCI+JyArXG4gICAgICAgICAgJzxsaSBuZy1jbGFzcz1cIntkaXNhYmxlZDogcGFnZSA8PSAwfVwiPjxhIGhyZWYgbmctY2xpY2s9XCJnb3RvUGFnZShwYWdlLTEpXCI+JmxhcXVvOzwvYT48L2xpPicgK1xuICAgICAgICAgICc8bGkgbmctaWY9XCJsaW5rR3JvdXBGaXJzdCgpID4gMFwiPjxhIGhyZWYgbmctY2xpY2s9XCJnb3RvUGFnZSgwKVwiPjE8L2E+PC9saT4nICtcbiAgICAgICAgICAnPGxpIG5nLWlmPVwibGlua0dyb3VwRmlyc3QoKSA+IDFcIiBjbGFzcz1cImRpc2FibGVkXCI+PGEgaHJlZj4maGVsbGlwOzwvYT48L2xpPicgK1xuICAgICAgICAgICc8bGkgbmctcmVwZWF0PVwicCBpbiBbbGlua0dyb3VwRmlyc3QoKSwgbGlua0dyb3VwTGFzdCgpXSB8IG1ha2VSYW5nZVwiIG5nLWNsYXNzPVwie2FjdGl2ZTogcCA9PT0gcGFnZX1cIj48YSBocmVmIG5nLWNsaWNrPVwiZ290b1BhZ2UocClcIj57e3ArMX19PC9hPjwvbGk+JyArXG4gICAgICAgICAgJzxsaSBuZy1pZj1cImxpbmtHcm91cExhc3QoKSA8IG51bVBhZ2VzIC0gMlwiIGNsYXNzPVwiZGlzYWJsZWRcIj48YSBocmVmPiZoZWxsaXA7PC9hPjwvbGk+JyArXG4gICAgICAgICAgJzxsaSBuZy1pZj1cImlzRmluaXRlKCkgJiYgbGlua0dyb3VwTGFzdCgpIDwgbnVtUGFnZXMgLSAxXCI+PGEgaHJlZiBuZy1jbGljaz1cImdvdG9QYWdlKG51bVBhZ2VzLTEpXCI+e3tudW1QYWdlc319PC9hPjwvbGk+JyArXG4gICAgICAgICAgJzxsaSBuZy1jbGFzcz1cIntkaXNhYmxlZDogcGFnZSA+PSBudW1QYWdlcyAtIDF9XCI+PGEgaHJlZiBuZy1jbGljaz1cImdvdG9QYWdlKHBhZ2UrMSlcIj4mcmFxdW87PC9hPjwvbGk+JyArXG4gICAgICAgICc8L3VsPicgK1xuICAgICAgJzwvZGl2PidcbiAgICApO1xuXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vc3VibWlzc2lvbnMuaHRtbCcsXG4gICAgICAnPGRpdj4nICtcbiAgICAgICAgJzx0YWJsZSBjbGFzcz1cInRhYmxlXCI+JyArXG4gICAgICAgICAgJzx0aGVhZD4nICtcbiAgICAgICAgICAgICc8dHI+JyArXG4gICAgICAgICAgICAgICc8dGggbmctcmVwZWF0PVwiY29tcG9uZW50IGluIF9mb3JtLmNvbXBvbmVudHMgfCBmbGF0dGVuQ29tcG9uZW50c1wiIG5nLWlmPVwidGFibGVWaWV3KGNvbXBvbmVudClcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fTwvdGg+JyArXG4gICAgICAgICAgICAgICc8dGg+U3VibWl0dGVkPC90aD4nICtcbiAgICAgICAgICAgICAgJzx0aD5VcGRhdGVkPC90aD4nICtcbiAgICAgICAgICAgICAgJzx0aD5PcGVyYXRpb25zPC90aD4nICtcbiAgICAgICAgICAgICc8L3RyPicgK1xuICAgICAgICAgICc8L3RoZWFkPicgK1xuICAgICAgICAgICc8dGJvZHk+JyArXG4gICAgICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInN1Ym1pc3Npb24gaW4gX3N1Ym1pc3Npb25zXCI+JyArXG4gICAgICAgICAgICAgICc8dGQgbmctcmVwZWF0PVwiY29tcG9uZW50IGluIF9mb3JtLmNvbXBvbmVudHMgfCBmbGF0dGVuQ29tcG9uZW50c1wiIG5nLWlmPVwidGFibGVWaWV3KGNvbXBvbmVudClcIj57eyBmaWVsZERhdGEoc3VibWlzc2lvbi5kYXRhLCBjb21wb25lbnQpIH19PC90ZD4nICtcbiAgICAgICAgICAgICAgJzx0ZD57eyBzdWJtaXNzaW9uLmNyZWF0ZWQgfCBhbURhdGVGb3JtYXQ6XFwnbCwgaDptbTpzcyBhXFwnIH19PC90ZD4nICtcbiAgICAgICAgICAgICAgJzx0ZD57eyBzdWJtaXNzaW9uLm1vZGlmaWVkIHwgYW1EYXRlRm9ybWF0OlxcJ2wsIGg6bW06c3MgYVxcJyB9fTwvdGQ+JyArXG4gICAgICAgICAgICAgICc8dGQ+JyArXG4gICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJidXR0b24tZ3JvdXBcIiBzdHlsZT1cImRpc3BsYXk6ZmxleDtcIj4nICtcbiAgICAgICAgICAgICAgICAgICc8YSBuZy1jbGljaz1cIiRlbWl0KFxcJ3N1Ym1pc3Npb25WaWV3XFwnLCBzdWJtaXNzaW9uKVwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi14c1wiPjxzcGFuIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1leWUtb3BlblwiPjwvc3Bhbj48L2E+Jm5ic3A7JyArXG4gICAgICAgICAgICAgICAgICAnPGEgbmctY2xpY2s9XCIkZW1pdChcXCdzdWJtaXNzaW9uRWRpdFxcJywgc3VibWlzc2lvbilcIiBjbGFzcz1cImJ0biBidG4tZGVmYXVsdCBidG4teHNcIj48c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tZWRpdFwiPjwvc3Bhbj48L2E+Jm5ic3A7JyArXG4gICAgICAgICAgICAgICAgICAnPGEgbmctY2xpY2s9XCIkZW1pdChcXCdzdWJtaXNzaW9uRGVsZXRlXFwnLCBzdWJtaXNzaW9uKVwiIGNsYXNzPVwiYnRuIGJ0bi1kYW5nZXIgYnRuLXhzXCI+PHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZS1jaXJjbGVcIj48L3NwYW4+PC9hPicgK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgICAgICAgJzwvdGQ+JyArXG4gICAgICAgICAgICAnPC90cj4nICtcbiAgICAgICAgICAnPC90Ym9keT4nICtcbiAgICAgICAgJzwvdGFibGU+JyArXG4gICAgICAgICc8YmdmLXBhZ2luYXRpb24gY29sbGVjdGlvbj1cIl9zdWJtaXNzaW9uc1wiIHVybD1cImZvcm1pby5zdWJtaXNzaW9uc1VybFwiIHBlci1wYWdlPVwicGVyUGFnZVwiIHRlbXBsYXRlLXVybD1cImZvcm1pby9wYWdlci5odG1sXCI+PC9iZ2YtcGFnaW5hdGlvbj4nICtcbiAgICAgICc8L2Rpdj4nXG4gICAgKTtcblxuICAgIC8vIEEgZm9ybWlvIGNvbXBvbmVudCB0ZW1wbGF0ZS5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnQuaHRtbCcsXG4gICAgICAnPG5nLWZvcm0gbmFtZT1cImZvcm1pb0ZpZWxkRm9ybVwiPicgK1xuICAgICAgICAnPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXAgaGFzLWZlZWRiYWNrIGZvcm0tZmllbGQtdHlwZS17eyBjb21wb25lbnQudHlwZSB9fVwiIGlkPVwiZm9ybS1ncm91cC17eyBjb21wb25lbnQua2V5IH19XCIgbmctY2xhc3M9XCJ7XFwnaGFzLWVycm9yXFwnOiBmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGludmFsaWQgJiYgIWZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kcHJpc3RpbmUgfVwiPicgK1xuICAgICAgICAgICc8Zm9ybWlvLWVsZW1lbnQ+PC9mb3JtaW8tZWxlbWVudD4nICtcbiAgICAgICAgJzwvZGl2PicgK1xuICAgICAgJzwvbmctZm9ybT4nXG4gICAgKTtcblxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2Vycm9ycy5odG1sJyxcbiAgICAgICc8ZGl2IG5nLXNob3c9XCJmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGVycm9yICYmICFmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJHByaXN0aW5lXCI+JyArXG4gICAgICAgICc8cCBjbGFzcz1cImhlbHAtYmxvY2tcIiBuZy1zaG93PVwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5lbWFpbFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgYSB2YWxpZCBlbWFpbC48L3A+JyArXG4gICAgICAgICc8cCBjbGFzcz1cImhlbHAtYmxvY2tcIiBuZy1zaG93PVwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5yZXF1aXJlZFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IGlzIHJlcXVpcmVkLjwvcD4nICtcbiAgICAgICAgJzxwIGNsYXNzPVwiaGVscC1ibG9ja1wiIG5nLXNob3c9XCJmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGVycm9yLm51bWJlclwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgYSBudW1iZXIuPC9wPicgK1xuICAgICAgICAnPHAgY2xhc3M9XCJoZWxwLWJsb2NrXCIgbmctc2hvdz1cImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IubWF4bGVuZ3RoXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBzaG9ydGVyIHRoYW4ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1heExlbmd0aCArIDEgfX0gY2hhcmFjdGVycy48L3A+JyArXG4gICAgICAgICc8cCBjbGFzcz1cImhlbHAtYmxvY2tcIiBuZy1zaG93PVwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5taW5sZW5ndGhcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIGxvbmdlciB0aGFuIHt7IGNvbXBvbmVudC52YWxpZGF0ZS5taW5MZW5ndGggLSAxIH19IGNoYXJhY3RlcnMuPC9wPicgK1xuICAgICAgICAnPHAgY2xhc3M9XCJoZWxwLWJsb2NrXCIgbmctc2hvdz1cImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IubWluXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBoaWdoZXIgdGhhbiB7eyBjb21wb25lbnQudmFsaWRhdGUubWluIC0gMSB9fS48L3A+JyArXG4gICAgICAgICc8cCBjbGFzcz1cImhlbHAtYmxvY2tcIiBuZy1zaG93PVwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5tYXhcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIGxvd2VyIHRoYW4ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1heCArIDEgfX0uPC9wPicgK1xuICAgICAgICAnPHAgY2xhc3M9XCJoZWxwLWJsb2NrXCIgbmctc2hvdz1cImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IuY3VzdG9tXCI+e3sgY29tcG9uZW50LmN1c3RvbUVycm9yIH19PC9wPicgK1xuICAgICAgJzwvZGl2PidcbiAgICApO1xuICB9XG5dKTtcblxucmVxdWlyZSgnLi9jb21wb25lbnRzJyk7XG4iLCIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICAvLyBUaGUgZGVmYXVsdCBiYXNlIHVybC5cbiAgdmFyIGJhc2VVcmwgPSAnJztcbiAgdmFyIGRvbWFpbjtcbiAgdmFyIG5vYWxpYXMgPSBmYWxzZTtcbiAgdmFyIGNhY2hlID0ge307XG5cbiAgLyoqXG4gICAqIFJldHVybnMgcGFydHMgb2YgdGhlIFVSTCB0aGF0IGFyZSBpbXBvcnRhbnQuXG4gICAqIEluZGV4ZXhcbiAgICogIC0gMDogVGhlIGZ1bGwgdXJsXG4gICAqICAtIDE6IFRoZSBwcm90b2NvbFxuICAgKiAgLSAyOiBUaGUgaG9zdG5hbWVcbiAgICogIC0gMzogVGhlIHJlc3RcbiAgICpcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIHZhciBnZXRVcmxQYXJ0cyA9IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiB1cmwubWF0Y2goL14oaHR0cFtzXT86XFwvXFwvKShbXi9dKykoJHxcXC8uKikvKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHByb3ZpZGVyIGludGVyZmFjZS5cbiAgcmV0dXJuIHtcblxuICAgIC8vIFNldCB0aGUgYmFzZSBVUkwgZm9yIHRoZSBmb3JtaW8gQVBJLlxuICAgIHNldEJhc2VVcmw6IGZ1bmN0aW9uKHVybCwgX25vYWxpYXMpIHtcbiAgICAgIG5vYWxpYXMgPSBfbm9hbGlhcztcbiAgICAgIGJhc2VVcmwgPSB1cmw7XG4gICAgfSxcbiAgICBzZXREb21haW46IGZ1bmN0aW9uKGRvbSkge1xuICAgICAgZG9tYWluID0gZG9tO1xuICAgIH0sXG4gICAgJGdldDogW1xuICAgICAgJyRodHRwJyxcbiAgICAgICckcScsXG4gICAgICAnZm9ybWlvSW50ZXJjZXB0b3InLFxuICAgICAgJyRsb2NhdGlvbicsXG4gICAgICAnJHJvb3RTY29wZScsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJGh0dHAsXG4gICAgICAgICRxLFxuICAgICAgICBmb3JtaW9JbnRlcmNlcHRvcixcbiAgICAgICAgJGxvY2F0aW9uLFxuICAgICAgICAkcm9vdFNjb3BlXG4gICAgICApIHtcblxuICAgICAgICAvLyBUaGUgZm9ybWlvIGNsYXNzLlxuICAgICAgICB2YXIgRm9ybWlvID0gZnVuY3Rpb24ocGF0aCkge1xuXG4gICAgICAgICAgLy8gRW5zdXJlIHdlIGhhdmUgYW4gaW5zdGFuY2Ugb2YgRm9ybWlvLlxuICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGb3JtaW8pKSB7IHJldHVybiBuZXcgRm9ybWlvKHBhdGgpOyB9XG4gICAgICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgICAgICAvLyBBbGxvdyB1c2VyIHRvIGNyZWF0ZSBuZXcgcHJvamVjdHMgaWYgdGhpcyB3YXMgaW5zdGFudGlhdGVkIHdpdGhvdXRcbiAgICAgICAgICAgIC8vIGEgdXJsXG4gICAgICAgICAgICB0aGlzLnByb2plY3RVcmwgPSBiYXNlVXJsICsgJy9wcm9qZWN0JztcbiAgICAgICAgICAgIHRoaXMucHJvamVjdElkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnF1ZXJ5ID0gJyc7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdXIgdmFyaWFibGVzLlxuICAgICAgICAgIHRoaXMucHJvamVjdFVybCA9ICcnO1xuICAgICAgICAgIHRoaXMucHJvamVjdElkID0gJyc7XG4gICAgICAgICAgdGhpcy5mb3JtVXJsID0gJyc7XG4gICAgICAgICAgdGhpcy5mb3Jtc1VybCA9ICcnO1xuICAgICAgICAgIHRoaXMuZm9ybUlkID0gJyc7XG4gICAgICAgICAgdGhpcy5zdWJtaXNzaW9uc1VybCA9ICcnO1xuICAgICAgICAgIHRoaXMuc3VibWlzc2lvblVybCA9ICcnO1xuICAgICAgICAgIHRoaXMuc3VibWlzc2lvbklkID0gJyc7XG4gICAgICAgICAgdGhpcy5hY3Rpb25zVXJsID0gJyc7XG4gICAgICAgICAgdGhpcy5hY3Rpb25JZCA9ICcnO1xuICAgICAgICAgIHRoaXMuYWN0aW9uVXJsID0gJyc7XG4gICAgICAgICAgdGhpcy5xdWVyeSA9ICcnO1xuXG4gICAgICAgICAgLy8gTm9ybWFsaXplIHRvIGFuIGFic29sdXRlIHBhdGguXG4gICAgICAgICAgaWYgKChwYXRoLmluZGV4T2YoJ2h0dHAnKSAhPT0gMCkgJiYgKHBhdGguaW5kZXhPZignLy8nKSAhPT0gMCkpIHtcbiAgICAgICAgICAgIGJhc2VVcmwgPSBiYXNlVXJsID8gYmFzZVVybCA6ICRsb2NhdGlvbi5hYnNVcmwoKS5tYXRjaCgvaHR0cFtzXT86XFwvXFwvYXBpLi8pWzBdO1xuICAgICAgICAgICAgcGF0aCA9IGJhc2VVcmwgKyBwYXRoO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBob3N0cGFydHMgPSBnZXRVcmxQYXJ0cyhwYXRoKTtcbiAgICAgICAgICB2YXIgaG9zdG5hbWVzID0gW107XG4gICAgICAgICAgdmFyIHN1YmRvbWFpbiA9ICcnO1xuICAgICAgICAgIGlmKGRvbWFpbikge1xuICAgICAgICAgICAgaWYoaG9zdHBhcnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgdmFyIGRvbWFpbkluZGV4ID0gaG9zdHBhcnRzWzJdLmluZGV4T2YoZG9tYWluKTtcbiAgICAgICAgICAgICAgaWYoZG9tYWluSW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgXCIuXCIgYmV0d2VlbiBzdWJkb21haW5zICYgZG9tYWluXG4gICAgICAgICAgICAgICAgZG9tYWluSW5kZXgtLTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBob3N0bmFtZXMgPSBob3N0bmFtZXMuY29uY2F0KGhvc3RwYXJ0c1syXS5zdWJzdHJpbmcoMCwgZG9tYWluSW5kZXgpLnNwbGl0KCcuJykpO1xuICAgICAgICAgICAgICBob3N0bmFtZXMgPSBob3N0bmFtZXMuY29uY2F0KGRvbWFpbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW5vYWxpYXMgJiYgaG9zdG5hbWVzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICAgIHN1YmRvbWFpbiA9IGhvc3RuYW1lc1swXTtcbiAgICAgICAgICAgICAgdGhpcy5wcm9qZWN0SWQgPSBzdWJkb21haW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJldmVydCB0byBvbGQgYmVoYXZpb3IgaWYgZG9tYWluIGlzIG5vdCBzZXRcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGhvc3RuYW1lcyA9IChob3N0cGFydHMubGVuZ3RoID4gMikgPyBob3N0cGFydHNbMl0uc3BsaXQoJy4nKSA6IFtdO1xuICAgICAgICAgICAgaWYoIW5vYWxpYXMgJiZcbiAgICAgICAgICAgICAgKCgoaG9zdG5hbWVzLmxlbmd0aCA9PT0gMikgJiYgKGhvc3RuYW1lc1sxXS5pbmRleE9mKCdsb2NhbGhvc3QnKSA9PT0gMCkpIHx8IChob3N0bmFtZXMubGVuZ3RoID49IDMpKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHN1YmRvbWFpbiA9IGhvc3RuYW1lc1swXTtcbiAgICAgICAgICAgICAgdGhpcy5wcm9qZWN0SWQgPSBzdWJkb21haW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gR2V0IHRoZSBwYXRocyBmb3IgdGhpcyBmb3JtaW8gdXJsLlxuICAgICAgICAgIHZhciBzdWJzID0gcGF0aC5tYXRjaCgvXFwvKHN1Ym1pc3Npb258YWN0aW9uKVxcLz8oW14/XSopLyk7XG4gICAgICAgICAgaWYgKHN1YnMgJiYgc3Vicy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBzdWJzLnNoaWZ0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gR2V0IHRoZSBiYXNlIHBhdGggd2l0aG91dCBzdWJtaXNzaW9ucyBhbmQgYWN0aW9ucy5cbiAgICAgICAgICAvLyBRdWljayB3YXkgdG8gdGVzdC4uLiBodHRwOi8vanNmaWRkbGUubmV0L3RyYXZpc3RpZHdlbGwvd0w0OUw3NjYvNC9cbiAgICAgICAgICB2YXIgcGF0aHMgPSBbXTtcbiAgICAgICAgICB2YXIgcXVlcnlwYXJ0cyA9IHBhdGguc3BsaXQoJz8nKTtcbiAgICAgICAgICB0aGlzLnF1ZXJ5ID0gKHF1ZXJ5cGFydHMubGVuZ3RoID4gMSkgPyAnPycgKyBxdWVyeXBhcnRzWzFdIDogJyc7XG4gICAgICAgICAgcGF0aCA9IHF1ZXJ5cGFydHNbMF0ucmVwbGFjZSgvXFwvKHN1Ym1pc3Npb258YWN0aW9uKSgkfFxcLy4qKS8sICcnKTtcbiAgICAgICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8kLywgJycpO1xuXG4gICAgICAgICAgLy8gU2VlIGlmIHRoaXMgdXJsIGhhcyBhIHN1YmRvbWFpbi5cbiAgICAgICAgICBpZiAoc3ViZG9tYWluICYmIHN1YmRvbWFpbiAhPT0gJ2FwaScpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcGF0aHMuXG4gICAgICAgICAgICBwYXRocyA9IHBhdGgubWF0Y2goLyhodHRwW3NdPzpcXC9cXC8/LipcXC4uKj8pXFwvKFteP10qKT8vKTtcbiAgICAgICAgICAgIGlmIChwYXRocyAmJiBwYXRocy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgIHBhdGhzLnNoaWZ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZvcm1wYXRocyA9IHBhdGgubWF0Y2goL15odHRwLipcXC8uKlxcL2Zvcm1cXC8/KFteP10qKS8pO1xuICAgICAgICAgICAgaWYgKGZvcm1wYXRocyAmJiBmb3JtcGF0aHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICBwYXRoc1sxXSA9IGZvcm1wYXRoc1sxXSA/ICdmb3JtLycgKyBmb3JtcGF0aHNbMV0gOiAnJztcbiAgICAgICAgICAgICAgcGF0aHNbMF0gPSBwYXRoc1sxXSA/IHBhdGgucmVwbGFjZSgnLycgKyBwYXRoc1sxXSwgJycpIDogcGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAvLyBBc3N1bWUgdGhpcyBpcyBhIHByb2plY3QgdXJsLlxuICAgICAgICAgICAgICBwYXRoc1swXSA9IHBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMucHJvamVjdFVybCA9IHBhdGhzWzBdO1xuICAgICAgICAgICAgdGhpcy5wcm9qZWN0SWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5mb3Jtc1VybCA9IHRoaXMucHJvamVjdFVybCA/ICh0aGlzLnByb2plY3RVcmwgKyAnL2Zvcm0nKSA6ICcnO1xuICAgICAgICAgICAgdGhpcy5mb3JtSWQgPSAocGF0aHMubGVuZ3RoID4gMSkgPyBwYXRoc1sxXSA6ICcnO1xuICAgICAgICAgICAgdGhpcy5mb3JtVXJsID0gdGhpcy5wcm9qZWN0VXJsID8gKHRoaXMucHJvamVjdFVybCArICcvJyArIHRoaXMuZm9ybUlkKSA6ICcnO1xuICAgICAgICAgICAgdGhpcy5wYXRoVHlwZSA9IChzdWJzICYmIChzdWJzLmxlbmd0aCA+IDApKSA/IHN1YnNbMF0gOiAnJztcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChbJ3N1Ym1pc3Npb24nLCAnYWN0aW9uJ10sIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgdmFyIGluZGV4ID0gaXRlbSArICdzVXJsJztcbiAgICAgICAgICAgICAgdmFyIGl0ZW1JZCA9IGl0ZW0gKyAnSWQnO1xuICAgICAgICAgICAgICB2YXIgaXRlbVVybCA9IGl0ZW0gKyAnVXJsJztcbiAgICAgICAgICAgICAgdGhpc1tpbmRleF0gPSB0aGlzLmZvcm1VcmwgPyAodGhpcy5mb3JtVXJsICsgJy8nICsgaXRlbSkgOiAnJztcbiAgICAgICAgICAgICAgdGhpc1tpdGVtSWRdID0gKHN1YnMgJiYgKHRoaXMucGF0aFR5cGUgPT09IGl0ZW0pICYmIChzdWJzLmxlbmd0aCA+IDEpKSA/IHN1YnNbMV0gOiAnJztcbiAgICAgICAgICAgICAgdGhpc1tpdGVtVXJsXSA9IHRoaXNbaXRlbUlkXSA/IHRoaXNbaW5kZXhdICsgJy8nICsgdGhpc1tpdGVtSWRdIDogdGhpc1tpbmRleF07XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbiBhIHJlcXVlc3QgZXJyb3Igb2NjdXJzLlxuICAgICAgICAgKiBAcGFyYW0gZGVmZXJyZWRcbiAgICAgICAgICovXG4gICAgICAgIHZhciByZXF1ZXN0RXJyb3IgPSBmdW5jdGlvbihkZWZlcnJlZCkge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgaWYgKGVycm9yID09PSAnVW5hdXRob3JpemVkJykge1xuICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Zvcm1pby51bmF1dGhvcml6ZWQnLCBlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChlcnJvciA9PT0gJ0xvZ2luIFRpbWVvdXQnKSB7XG4gICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQZXJmb3JtIGEgcmVxdWVzdCBHRVQgcmVxdWVzdCB3aXRoIGNhY2hpbmcgYWJpbGl0aWVzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdXJsXG4gICAgICAgICAqIEBwYXJhbSBxdWVyeVxuICAgICAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgICAgICovXG4gICAgICAgIHZhciByZXF1ZXN0ID0gZnVuY3Rpb24odXJsLCBxdWVyeSkge1xuICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgaWYgKCF1cmwpIHsgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7IH1cblxuICAgICAgICAgIC8vIEdldCB0aGUgY2FjaGVkIHByb21pc2UgdG8gc2F2ZSBtdWx0aXBsZSBsb2Fkcy5cbiAgICAgICAgICB2YXIgY2FjaGVLZXkgPSB1cmw7XG4gICAgICAgICAgY2FjaGVLZXkgKz0gcXVlcnkgPyBhbmd1bGFyLnRvSnNvbihxdWVyeSkgOiAnJztcbiAgICAgICAgICBjYWNoZUtleSA9IGJ0b2EoY2FjaGVLZXkpO1xuICAgICAgICAgIGlmIChjYWNoZS5oYXNPd25Qcm9wZXJ0eShjYWNoZUtleSkpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZVtjYWNoZUtleV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuXG4gICAgICAgICAgICAvLyBTZXQgdGhlIGNhY2hlLCB0aGVuIHNlbmQgdGhlIHJlcXVlc3QuXG4gICAgICAgICAgICBjYWNoZVtjYWNoZUtleV0gPSBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCwgcXVlcnkpLnN1Y2Nlc3MoZGVmZXJyZWQucmVzb2x2ZSkuZXJyb3IocmVxdWVzdEVycm9yKGRlZmVycmVkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTG9hZCBhIHJlc291cmNlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgX2xvYWQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgdmFyIF9pZCA9IHR5cGUgKyAnSWQnO1xuICAgICAgICAgIHZhciBfdXJsID0gdHlwZSArICdVcmwnO1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzW19pZF0pIHsgcmV0dXJuICRxLmRlZmVyKCkucHJvbWlzZTsgfVxuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3QodGhpc1tfdXJsXSArIHRoaXMucXVlcnksIHF1ZXJ5KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTYXZlIGEgcmVzb3VyY2UuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHZhciBfc2F2ZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICB2YXIgX2lkID0gdHlwZSArICdJZCc7XG4gICAgICAgICAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBpZiAoIXRoaXNbX3VybF0pIHsgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7IH1cbiAgICAgICAgICAgIHZhciBtZXRob2QgPSB0aGlzW19pZF0gPyAncHV0JyA6ICdwb3N0JztcbiAgICAgICAgICAgICRodHRwW21ldGhvZF0odGhpc1tfdXJsXSArIHRoaXMucXVlcnksIGRhdGEpXG4gICAgICAgICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBjYWNoZSA9IHt9O1xuICAgICAgICAgICAgICAgIHJlc3VsdC5tZXRob2QgPSBtZXRob2Q7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuZXJyb3IocmVxdWVzdEVycm9yKGRlZmVycmVkKSk7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWxldGUgYSByZXNvdXJjZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHR5cGVcbiAgICAgICAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIF9kZWxldGUgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgdmFyIF9pZCA9IHR5cGUgKyAnSWQnO1xuICAgICAgICAgIHZhciBfdXJsID0gdHlwZSArICdVcmwnO1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBpZiAoIXRoaXNbX2lkXSkgeyByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTsgfVxuICAgICAgICAgICAgY2FjaGUgPSB7fTtcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSh0aGlzW191cmxdKS5zdWNjZXNzKGRlZmVycmVkLnJlc29sdmUpLmVycm9yKHJlcXVlc3RFcnJvcihkZWZlcnJlZCkpO1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVzb3VyY2UgaW5kZXggbWV0aG9kLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgX2luZGV4ID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgIHZhciBfdXJsID0gdHlwZSArICdzVXJsJztcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0KHRoaXNbX3VybF0sIHF1ZXJ5KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSBzcGVjaWZpYyBDUlVEIG1ldGhvZHMuXG4gICAgICAgIEZvcm1pby5wcm90b3R5cGUubG9hZFByb2plY3QgPSBfbG9hZCgncHJvamVjdCcpO1xuICAgICAgICBGb3JtaW8ucHJvdG90eXBlLnNhdmVQcm9qZWN0ID0gX3NhdmUoJ3Byb2plY3QnKTtcbiAgICAgICAgRm9ybWlvLnByb3RvdHlwZS5kZWxldGVQcm9qZWN0ID0gX2RlbGV0ZSgncHJvamVjdCcpO1xuICAgICAgICBGb3JtaW8ucHJvdG90eXBlLmxvYWRGb3JtID0gX2xvYWQoJ2Zvcm0nKTtcbiAgICAgICAgRm9ybWlvLnByb3RvdHlwZS5zYXZlRm9ybSA9IF9zYXZlKCdmb3JtJyk7XG4gICAgICAgIEZvcm1pby5wcm90b3R5cGUuZGVsZXRlRm9ybSA9IF9kZWxldGUoJ2Zvcm0nKTtcbiAgICAgICAgRm9ybWlvLnByb3RvdHlwZS5sb2FkRm9ybXMgPSBfaW5kZXgoJ2Zvcm0nKTtcbiAgICAgICAgRm9ybWlvLnByb3RvdHlwZS5sb2FkU3VibWlzc2lvbiA9IF9sb2FkKCdzdWJtaXNzaW9uJyk7XG4gICAgICAgIEZvcm1pby5wcm90b3R5cGUuc2F2ZVN1Ym1pc3Npb24gPSBfc2F2ZSgnc3VibWlzc2lvbicpO1xuICAgICAgICBGb3JtaW8ucHJvdG90eXBlLmRlbGV0ZVN1Ym1pc3Npb24gPSBfZGVsZXRlKCdzdWJtaXNzaW9uJyk7XG4gICAgICAgIEZvcm1pby5wcm90b3R5cGUubG9hZFN1Ym1pc3Npb25zID0gX2luZGV4KCdzdWJtaXNzaW9uJyk7XG4gICAgICAgIEZvcm1pby5wcm90b3R5cGUubG9hZEFjdGlvbiA9IF9sb2FkKCdhY3Rpb24nKTtcbiAgICAgICAgRm9ybWlvLnByb3RvdHlwZS5zYXZlQWN0aW9uID0gX3NhdmUoJ2FjdGlvbicpO1xuICAgICAgICBGb3JtaW8ucHJvdG90eXBlLmRlbGV0ZUFjdGlvbiA9IF9kZWxldGUoJ2FjdGlvbicpO1xuICAgICAgICBGb3JtaW8ucHJvdG90eXBlLmxvYWRBY3Rpb25zID0gX2luZGV4KCdhY3Rpb24nKTtcbiAgICAgICAgRm9ybWlvLnByb3RvdHlwZS5hdmFpbGFibGVBY3Rpb25zID0gZnVuY3Rpb24oKSB7IHJldHVybiByZXF1ZXN0KHRoaXMuZm9ybVVybCArICcvYWN0aW9ucycpOyB9O1xuICAgICAgICBGb3JtaW8ucHJvdG90eXBlLmFjdGlvbkluZm8gPSBmdW5jdGlvbihuYW1lKSB7IHJldHVybiByZXF1ZXN0KHRoaXMuZm9ybVVybCArICcvYWN0aW9ucy8nICsgbmFtZSk7IH07XG5cbiAgICAgICAgLy8gU3RhdGljIG1ldGhvZHMuXG4gICAgICAgIEZvcm1pby5sb2FkUHJvamVjdHMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHJlcXVlc3QoYmFzZVVybCArICcvcHJvamVjdCcpOyB9O1xuICAgICAgICBGb3JtaW8uY2xlYXJDYWNoZSA9IGZ1bmN0aW9uKCkgeyBjYWNoZSA9IHt9OyB9O1xuICAgICAgICBGb3JtaW8uYmFzZVVybCA9IGJhc2VVcmw7XG4gICAgICAgIEZvcm1pby5zZXRVc2VyID0gZm9ybWlvSW50ZXJjZXB0b3Iuc2V0VXNlci5iaW5kKGZvcm1pb0ludGVyY2VwdG9yKTtcbiAgICAgICAgRm9ybWlvLmdldFVzZXIgPSBmb3JtaW9JbnRlcmNlcHRvci5nZXRVc2VyLmJpbmQoZm9ybWlvSW50ZXJjZXB0b3IpO1xuICAgICAgICBGb3JtaW8uc2V0VG9rZW4gPSBmb3JtaW9JbnRlcmNlcHRvci5zZXRUb2tlbi5iaW5kKGZvcm1pb0ludGVyY2VwdG9yKTtcbiAgICAgICAgRm9ybWlvLmdldFRva2VuID0gZm9ybWlvSW50ZXJjZXB0b3IuZ2V0VG9rZW4uYmluZChmb3JtaW9JbnRlcmNlcHRvcik7XG4gICAgICAgIEZvcm1pby5jdXJyZW50VXNlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgdmFyIHVzZXIgPSB0aGlzLmdldFVzZXIoKTtcbiAgICAgICAgICBpZiAodXNlcikgeyBkZWZlcnJlZC5yZXNvbHZlKGFuZ3VsYXIuZnJvbUpzb24odXNlcikpOyByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTsgfVxuICAgICAgICAgIHZhciB0b2tlbiA9IHRoaXMuZ2V0VG9rZW4oKTtcbiAgICAgICAgICBpZiAoIXRva2VuKSB7IGRlZmVycmVkLnJlc29sdmUobnVsbCk7IHJldHVybiBkZWZlcnJlZC5wcm9taXNlOyB9XG4gICAgICAgICAgJGh0dHAuZ2V0KGJhc2VVcmwgKyAnL2N1cnJlbnQnKS5zdWNjZXNzKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0VXNlcih1c2VyKTtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodXNlcik7XG4gICAgICAgICAgfS5iaW5kKHRoaXMpKS5lcnJvcihyZXF1ZXN0RXJyb3IoZGVmZXJyZWQpKTtcbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZWlyIGxvZ291dCBjYWxsYmFjay5cbiAgICAgICAgRm9ybWlvLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICcvbG9nb3V0JykuZmluYWxseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9rZW4obnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldFVzZXIobnVsbCk7XG4gICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfTtcbiAgICAgICAgRm9ybWlvLmZpZWxkRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCkge1xuICAgICAgICAgIGlmICghZGF0YSkgeyByZXR1cm4gJyc7IH1cbiAgICAgICAgICBpZiAoY29tcG9uZW50LmtleS5pbmRleE9mKCcuJykgIT09IC0xKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBkYXRhO1xuICAgICAgICAgICAgdmFyIHBhcnRzID0gY29tcG9uZW50LmtleS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIGtleSA9ICcnO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICBrZXkgPSBwYXJ0c1tpXTtcblxuICAgICAgICAgICAgICAvLyBIYW5kbGUgbmVzdGVkIHJlc291cmNlc1xuICAgICAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5kYXRhO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gUmV0dXJuIGlmIHRoZSBrZXkgaXMgbm90IGZvdW5kIG9uIHRoZSB2YWx1ZS5cbiAgICAgICAgICAgICAgaWYgKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ29udmVydCBvbGQgc2luZ2xlIGZpZWxkIGRhdGEgaW4gc3VibWlzc2lvbnMgdG8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgaWYoa2V5ID09PSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSAmJiBjb21wb25lbnQubXVsdGlwbGUgJiYgIUFycmF5LmlzQXJyYXkodmFsdWVba2V5XSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZVtrZXldID0gW3ZhbHVlW2tleV1dO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBvZiB0aGlzIGtleS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgb2xkIHNpbmdsZSBmaWVsZCBkYXRhIGluIHN1Ym1pc3Npb25zIHRvIG11bHRpcGxlXG4gICAgICAgICAgICBpZihjb21wb25lbnQubXVsdGlwbGUgJiYgIUFycmF5LmlzQXJyYXkoZGF0YVtjb21wb25lbnQua2V5XSkpIHtcbiAgICAgICAgICAgICAgZGF0YVtjb21wb25lbnQua2V5XSA9IFtkYXRhW2NvbXBvbmVudC5rZXldXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkYXRhW2NvbXBvbmVudC5rZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIGZvcm1pbyBpbnRlcmZhY2UuXG4gICAgICAgIHJldHVybiBGb3JtaW87XG4gICAgICB9XG4gICAgXVxuICB9O1xufTtcbiJdfQ==
