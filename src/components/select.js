/*eslint max-depth: ["error", 6]*/
var fs = require('fs');
var _get = require('lodash/get');
var _isEqual = require('lodash/isEqual');
var _assign = require('lodash/assign');
var _set = require('lodash/set');
var _cloneDeep = require('lodash/cloneDeep');
var _mapValues = require('lodash/mapValues');
var _isNil = require('lodash/isNil');
module.exports = function(app) {
  app.directive('formioSelectItem', [
    '$compile',
    '$filter',
    function($compile, $filter) {
      return {
        restrict: 'E',
        scope: {
          template: '=',
          item: '=',
          select: '='
        },
        link: function(scope, element) {
          if (scope.options && scope.options.building) return;
          if (scope.template) {
            if (scope.item && scope.item.label) {
              scope.item.label = $filter('formioTranslate')(scope.item.label);
            }
            element.append($compile(angular.element(scope.template))(scope));
          }
        }
      };
    }
  ]);

  app.directive('uiSelectRequired', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        if (scope.options && scope.options.building) return;
        var oldIsEmpty = ngModel.$isEmpty;
        ngModel.$isEmpty = function(value) {
          return (Array.isArray(value) && value.length === 0) || oldIsEmpty(value);
        };
      }
    };
  });

  // Configure the Select component.
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('select', {
        title: 'Select',
        template: function($scope) {
          return $scope.component.multiple ? 'formio/components/select-multiple.html' : 'formio/components/select.html';
        },
        tableView: function(data, options) {
          var getItem = function(data) {
            switch (options.component.dataSrc) {
              case 'values':
                options.component.data.values.forEach(function(item) {
                  if (item.value === data) {
                    data = item;
                  }
                });
                return data;
              case 'json':
                if (options.component.valueProperty) {
                  var selectItems;
                  try {
                    selectItems = angular.fromJson(options.component.data.json);
                  }
                  catch (error) {
                    selectItems = [];
                  }
                  selectItems.forEach(function(item) {
                    if (item[options.component.valueProperty] === data) {
                      data = item;
                    }
                  });
                }
                return data;
              // TODO: implement url and resource view.
              case 'url':
              case 'resource':
              default:
                return data;
            }
          };
          if (options.component.multiple && Array.isArray(data)) {
            return data.map(getItem).reduce(function(prev, item) {
              var value;
              if (typeof item === 'object') {
                value = options.$interpolate(options.component.template)({item: item});
              }
              else {
                value = item;
              }
              return (prev === '' ? '' : ', ') + value;
            }, '');
          }
          else {
            var item = getItem(data);
            var value;
            if (typeof item === 'object') {
              value = options.$interpolate(options.component.template)({item: item});
            }
            else {
              value = item;
            }
            return value;
          }
        },
        controller: [
          '$rootScope',
          '$scope',
          '$http',
          'Formio',
          'FormioUtils',
          '$interpolate',
          '$q',
          '$timeout',
          function(
            $rootScope,
            $scope,
            $http,
            Formio,
            FormioUtils,
            $interpolate,
            $q,
            $timeout
          ) {
            // FOR-71 - Skip functionality in the options.building view.
            if ($scope.options && $scope.options.building) return;
            var settings = $scope.component;
            var options = {};
            $scope.nowrap = true;
            $scope.hasNextPage = false;
            $scope.selectItems = [];

            if (settings.autofocus) {
              $timeout(function() {
                var inputs = angular.element('#form-group-' + settings.key).find('input');
                inputs[settings.multiple ? 0 : 1].focus();
              });
            }

            var initialized = $q.defer();
            initialized.promise.then(function() {
              $scope.$emit('selectLoaded', $scope.component);
            });

            var selectValues = $scope.component.selectValues;
            var valueProp = $scope.component.valueProperty;
            $scope.getSelectItem = function(item) {
              if (!item) {
                return '';
              }
              if (settings.dataSrc === 'values') {
                return item.value;
              }

              // Get the item value.
              var itemValue = valueProp ? _get(item, valueProp) : item;
              if (itemValue === undefined) {
                /* eslint-disable no-console */
                console.warn('Cannot find value property within select: ' + valueProp);
                /* eslint-enable no-console */
              }
              return itemValue;
            };

            $scope.refreshItems = function() {
              return $q.resolve([]);
            };
            $scope.autocompleteValueChanged = function () {
              //update select value if autocomplete input changed
              $scope.submission.data[$scope.component.key] = $scope.autocompleteValue;
            };
            $scope.$on('refreshList', function(event, url, input) {
              $scope.refreshItems(input, url);
            });

            $scope.clearSelected = function(event) {
              event.stopPropagation();
              event.preventDefault();
              delete $scope.data[$scope.component.key];
            };

            var refreshing = false;
            var refreshValue = function() {
              if (refreshing) {
                return;
              }
              refreshing = true;
              var tempData = $scope.data[settings.key];
              $scope.data[settings.key] = settings.multiple ? [] : '';
              if (!settings.clearOnRefresh || $scope.readOnly) {
                $timeout(function() {
                  $scope.data[settings.key] = tempData;
                  refreshing = false;
                  $scope.$emit('selectLoaded', $scope.component);
                });
              }
              else {
                refreshing = false;
                $scope.$emit('selectLoaded', $scope.component);
                var index = $scope.selectItems.indexOf(tempData);
                if (index !== -1) {
                  $scope.selectItems.splice(index, 1);
                }
              }
            };

            // Ensures that the value is within the select items.
            var ensureValue = function(value) {
              value = _isNil(value) ? $scope.data[settings.key] : value;
              if (_isNil(value) || (Array.isArray(value) && value.length === 0)) {
                return;
              }
              if (Array.isArray(value)) {
                value.forEach(ensureValue);
                return;
              }
              // Iterate through the list of items and see if our value exists...
              var found = false;
              for (var i = 0; i < $scope.selectItems.length; i++) {
                var item = $scope.selectItems[i];
                var selectItem = $scope.getSelectItem(item);
                if (_isEqual(selectItem, value)) {
                  found = true;
                  break;
                }
              }

              // If the item is not found in the select items array, then add it manually.
              if (!found) {
                var itemValue = value;
                if (valueProp) {
                  itemValue = {};
                  _set(itemValue, valueProp, value);
                }
                $scope.selectItems.push(itemValue);
              }
            };

            // Refresh the items when ready.
            var refreshItemsWhenReady = function() {
              initialized.promise.then(function() {
                var refreshPromise = $scope.refreshItems(true);
                if (refreshPromise) {
                  refreshPromise.then(refreshValue);
                }
                else {
                  refreshValue();
                }
              });
            };

            // Add a watch if they wish to refresh on selection of another field.
            if (settings.refreshOn) {
              if (settings.refreshOn === 'data') {
                $scope.$watch('data', refreshItemsWhenReady, true);
                return;
              }

              $scope.$watch('data.' + settings.refreshOn, refreshItemsWhenReady);
              $scope.$watch('submission.data.' + settings.refreshOn, refreshItemsWhenReady);
            }
            else {
              // Watch for the data to be set, and ensure the value is set properly.
              var dataWatch = $scope.$watch('data.' + settings.key, function(value) {
                if (value) {
                  initialized.promise.then(function() {
                    dataWatch();
                    ensureValue();
                  });
                }
              });
            }

            var lastInput;
            switch (settings.dataSrc) {
              case 'values':
                $scope.selectItems = settings.data.values;
                initialized.resolve();
                break;
              case 'json':
                var items;

                // Set the new result.
                var setResult = function(data, append) {
                  // coerce the data into an array.
                  if (!Array.isArray(data)) {
                    data = [data];
                  }

                  if (data.length < options.params.limit) {
                    $scope.hasNextPage = false;
                  }
                  if (append) {
                    $scope.selectItems = $scope.selectItems.concat(data);
                  }
                  else {
                    $scope.selectItems = data;
                  }
                };

                try {
                  if (typeof $scope.component.data.json === 'string') {
                    items = angular.fromJson($scope.component.data.json);
                  }
                  else if (typeof $scope.component.data.json === 'object') {
                    items = $scope.component.data.json;
                  }
                  else {
                    items = [];
                  }

                  if (selectValues) {
                    // Allow dot notation in the selectValue property.
                    if (selectValues.indexOf('.') !== -1) {
                      var parts = selectValues.split('.');
                      var select = items;
                      for (var i in parts) {
                        select = select[parts[i]];
                      }
                      items = select;
                    }
                    else {
                      items = items[selectValues];
                    }
                  }
                }
                catch (error) {
                  /* eslint-disable no-console */
                  console.warn('Error parsing JSON in ' + $scope.component.key, error);
                  /* eslint-enable no-console */
                  items = [];
                }
                options.params = {
                  limit: $scope.component.limit || 20,
                  skip: 0
                };

                $scope.refreshItems = function(input, url, append) {
                  // If they typed in a search, reset skip.
                  if (lastInput !== input) {
                    lastInput = input;
                    options.params.skip = 0;
                  }
                  var selectItems = items;
                  if (input) {
                    selectItems = selectItems.filter(function(item) {
                      // Get the visible string from the interpolated item.
                      var value = $interpolate($scope.component.template)({item: item}).replace(/<(?:.|\n)*?>/gm, '');
                      switch ($scope.component.filter) {
                        case 'startsWith':
                          return value.toLowerCase().lastIndexOf(input.toLowerCase(), 0) === 0;
                        case 'contains':
                          return value.toLowerCase().indexOf(input.toLowerCase()) !== -1;
                        default:
                          return value.toLowerCase().lastIndexOf(input.toLowerCase(), 0) === 0;
                      }
                    });
                  }
                  options.params.skip = parseInt(options.params.skip, 10);
                  options.params.limit = parseInt(options.params.limit, 10);
                  selectItems = selectItems.slice(options.params.skip, options.params.skip + options.params.limit);
                  setResult(selectItems, append);
                  return initialized.resolve($scope.selectItems);
                };
                $scope.refreshItems();
                break;
              case 'custom':
                $scope.refreshItems = function() {
                  try {
                    /* eslint-disable no-unused-vars */
                    var data = _cloneDeep($scope.submission.data);
                    var row = _cloneDeep($scope.data);
                    /* eslint-enable no-unused-vars */
                    $scope.selectItems = eval('(function(data, row) { var values = [];' + settings.data.custom.toString() + '; return values; })(data, row)');
                  }
                  catch (error) {
                    $scope.selectItems = [];
                  }
                  return initialized.resolve($scope.selectItems);
                };
                $scope.refreshItems();
                break;
              case 'url':
              case 'resource':
                if (settings.filter === 'contains' || settings.filter === 'startsWith') {
                  settings.filter = '';
                  $scope.component.filter = '';
                }
                $scope.options = $scope.options || {};
                var url = '';
                var baseUrl = Formio.setScopeBase($scope);
                if (settings.dataSrc === 'url') {
                  url = settings.data.url;
                  if (url.substr(0, 1) === '/') {
                    url = baseUrl + settings.data.url;
                  }

                  // Disable auth for outgoing requests.
                  if (!settings.authenticate && url.indexOf(baseUrl) === -1) {
                    options.disableJWT = true;
                    options.headers = options.headers || {};
                    options.headers.Authorization = undefined;
                    options.headers.Pragma = undefined;
                    options.headers['Cache-Control'] = undefined;
                  }
                }
                else if ($scope.formio) {
                  url = $scope.formio.formsUrl + '/' + settings.data.resource + '/submission';
                }
                else {
                  url = baseUrl;
                  if (settings.data.project) {
                    if (settings.data.project.match(/^[0-9a-fA-F]{24}$/)) {
                      url += '/project';
                    }
                    url += '/' + settings.data.project;
                  }
                  url += '/form/' + settings.data.resource + '/submission';
                }

                options.params = {
                  limit: $scope.component.limit || 100,
                  skip: 0
                };

                $scope.loadMoreItems = function($select, $event) {
                  $event.stopPropagation();
                  $event.preventDefault();
                  options.params.skip = parseInt(options.params.skip, 10);
                  options.params.skip += parseInt(options.params.limit, 10);
                  $scope.refreshItems(true, null, true);
                };

                if (url) {
                  $scope.hasNextPage = true;
                  $scope.refreshItems = function(input, newUrl, append) {
                    if (typeof input === 'string') {
                      if (input === lastInput) {
                        return;
                      }
                      else {
                        // Since the search has changed, reset the limit and skip.
                        options.params.limit = $scope.component.limit || 100;
                        options.params.skip = 0;
                      }
                    }

                    lastInput = input;
                    newUrl = newUrl || url;
                    newUrl = $interpolate(newUrl)({
                      data: $scope.submission ? $scope.submission.data : {},
                      row: $scope.data || {},
                      formioBase: $rootScope.apiBase || 'https://api.form.io'
                    });
                    if (!newUrl) {
                      return;
                    }

                    // If this is a search, then add that to the filter.
                    if (
                      settings.searchField &&
                      (typeof input === 'string') &&
                      input
                    ) {
                      options.params[settings.searchField] = /__regex$/.test(settings.searchField)
                        ? FormioUtils.escapeRegExCharacters(input)
                        : input;
                    }
                    else {
                      delete options.params[settings.searchField];
                    }

                    // Add the other filter.
                    if (settings.filter) {
                      // This changes 'a=b&c=d' into an object and assigns to params.
                      _assign(options.params, _mapValues(JSON.parse('{"' + decodeURI(settings.filter).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}'), function(value) {
                        return $interpolate(value)({
                          data: $scope.submission ? $scope.submission.data : {},
                          row: $scope.data
                        });
                      }));
                    }

                    // If they wish to return only some fields.
                    if (settings.selectFields) {
                      options.params.select = settings.selectFields;
                    }

                    // Set the new result.
                    var setResult = function(data) {
                      // coerce the data into an array.
                      if (!Array.isArray(data)) {
                        data = [data];
                      }

                      if (data.length < options.params.limit) {
                        $scope.hasNextPage = false;
                      }
                      else {
                        $scope.hasNextPage = true;
                      }
                      if (append) {
                        $scope.selectItems = $scope.selectItems.concat(data);
                      }
                      else {
                        $scope.selectItems = _cloneDeep(data);
                      }

                      // Ensure the value is set to what it should be set to.
                      ensureValue();
                    };

                    var promise;
                    if (settings.dataSrc === 'resource') {
                      promise = (new Formio(newUrl, {base: baseUrl})).loadSubmissions(options);
                    }
                    else {
                      // Add in headers if specified
                      if ($scope.component.data.hasOwnProperty('headers') && $scope.component.data.headers.length > 0) {
                        options.headers = _assign(options.headers, $scope.component.data.headers.reduce(function(headers, current) {
                          if (current.key) {
                            headers[current.key] = current.value;
                          }
                          return headers;
                        }, {}));
                      }

                      //If disableLimit is true and data source is 'url' then removing 'limit' and 'skip' parameters from options.
                      if (settings.dataSrc === 'url' && settings.data.disableLimit) {
                        delete options.params.limit;
                        delete options.params.skip;
                      }

                      promise = $http.get(newUrl, options).then(function(result) {
                        return result.data;
                      });
                    }

                    return promise.then(function(data) {
                      if (data) {
                        // If the selectValue prop is defined, use it.
                        if (selectValues) {
                          setResult(_get(data, selectValues, []));
                        }
                        // Attempt to default to the formio settings for a resource.
                        else if (data.hasOwnProperty('data')) {
                          setResult(data.data);
                        }
                        else if (data.hasOwnProperty('items')) {
                          setResult(data.items);
                        }
                        // Use the data itself.
                        else {
                          setResult(data);
                        }
                      }
                      return $scope.selectItems;
                    }).finally(function() {
                      initialized.resolve($scope.selectItems);
                    });
                  };
                  $scope.refreshItems(true);
                }
                break;
              default:
                $scope.selectItems = [];
                initialized.resolve($scope.selectItems);
            }
          }
        ],
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          label: 'Select',
          key: 'select',
          placeholder: '',
          data: {
            values: [],
            json: '',
            url: '',
            resource: '',
            custom: ''
          },
          dataSrc: 'values',
          valueProperty: '',
          defaultValue: '',
          refreshOn: '',
          filter: '',
          authenticate: false,
          template: '<span>{{ item.label }}</span>',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/select.html',
        fs.readFileSync(__dirname + '/../templates/components/select.html', 'utf8')
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/select-multiple.html',
        $templateCache.get('formio/components/select.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};
