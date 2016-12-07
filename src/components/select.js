/*eslint max-depth: ["error", 6]*/
var fs = require('fs');
module.exports = function(app) {
  app.directive('formioSelectItem', [
    '$compile',
    function($compile) {
      return {
        restrict: 'E',
        scope: {
          template: '=',
          item: '=',
          select: '='
        },
        link: function(scope, element) {
          if (scope.builder) return;
          if (scope.template) {
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
        if (scope.builder) return;
        var oldIsEmpty = ngModel.$isEmpty;
        ngModel.$isEmpty = function(value) {
          return (Array.isArray(value) && value.length === 0) || oldIsEmpty(value);
        };
      }
    };
  });

  // A directive to have ui-select open on focus
  app.directive('uiSelectOpenOnFocus', ['$timeout', function($timeout) {
    return {
      require: 'uiSelect',
      restrict: 'A',
      link: function($scope, el, attrs, uiSelect) {
        if ($scope.builder) return;
        var autoopen = true;

        angular.element(uiSelect.focusser).on('focus', function() {
          if (autoopen) {
            uiSelect.activate();
          }
        });

        // Disable the auto open when this select element has been activated.
        $scope.$on('uis:activate', function() {
          autoopen = false;
        });

        // Re-enable the auto open after the select element has been closed
        $scope.$on('uis:close', function() {
          autoopen = false;
          $timeout(function() {
            autoopen = true;
          }, 250);
        });
      }
    };
  }]);

  // Configure the Select component.
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('select', {
        title: 'Select',
        template: function($scope) {
          return $scope.component.multiple ? 'formio/components/select-multiple.html' : 'formio/components/select.html';
        },
        tableView: function(data, component, $interpolate) {
          var getItem = function(data) {
            switch (component.dataSrc) {
              case 'values':
                component.data.values.forEach(function(item) {
                  if (item.value === data) {
                    data = item;
                  }
                });
                return data;
              case 'json':
                if (component.valueProperty) {
                  var selectItems;
                  try {
                    selectItems = angular.fromJson(component.data.json);
                  }
                  catch (error) {
                    selectItems = [];
                  }
                  selectItems.forEach(function(item) {
                    if (item[component.valueProperty] === data) {
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
          if (component.multiple && Array.isArray(data)) {
            return data.map(getItem).reduce(function(prev, item) {
              var value;
              if (typeof item === 'object') {
                value = $interpolate(component.template)({item: item});
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
              value = $interpolate(component.template)({item: item});
            }
            else {
              value = item;
            }
            return value;
          }
        },
        controller: ['$rootScope', '$scope', '$http', 'Formio', '$interpolate', function($rootScope, $scope, $http, Formio, $interpolate) {
          // FOR-71 - Skip functionality in the builder view.
          if ($scope.builder) return;
          var settings = $scope.component;
          var options = {cache: true};
          $scope.nowrap = true;
          $scope.hasNextPage = false;
          $scope.selectItems = [];
          var selectValues = $scope.component.selectValues;
          var valueProp = $scope.component.valueProperty;
          $scope.getSelectItem = function(item) {
            if (!item) {
              return '';
            }
            if (settings.dataSrc === 'values') {
              return item.value;
            }

            // Allow dot notation in the value property.
            if (valueProp.indexOf('.') !== -1) {
              var parts = valueProp.split('.');
              var prop = item;
              for (var i in parts) {
                prop = prop[parts[i]];
              }
              return prop;
            }

            return valueProp ? item[valueProp] : item;
          };

          if (settings.multiple) {
            settings.defaultValue = [];
          }

          $scope.refreshItems = angular.noop;
          $scope.$on('refreshList', function(event, url, input) {
            $scope.refreshItems(input, url);
          });

          // Add a watch if they wish to refresh on selection of another field.
          var refreshWatch;
          if (settings.refreshOn) {
            // Remove the old watch.
            if (refreshWatch) refreshWatch();
            if (settings.refreshOn === 'data') {
              refreshWatch = $scope.$watch('data', function() {
                $scope.refreshItems();
                if (settings.clearOnRefresh) {
                  $scope.data[settings.key] = settings.multiple ? [] : '';
                }
              }, true);

              return;
            }

            refreshWatch = $scope.$watch('data.' + settings.refreshOn, function(newValue, oldValue) {
              $scope.refreshItems();
              if (settings.clearOnRefresh && (newValue !== oldValue)) {
                $scope.data[settings.key] = settings.multiple ? [] : '';
              }
            });
          }

          switch (settings.dataSrc) {
            case 'values':
              $scope.selectItems = settings.data.values;
              break;
            case 'json':
              try {
                $scope.selectItems = angular.fromJson(settings.data.json);

                if (selectValues) {
                  // Allow dot notation in the selectValue property.
                  if (selectValues.indexOf('.') !== -1) {
                    var parts = selectValues.split('.');
                    var select = $scope.selectItems;
                    for (var i in parts) {
                      select = select[parts[i]];
                    }
                    $scope.selectItems = select;
                  }
                  else {
                    $scope.selectItems = $scope.selectItems[selectValues];
                  }
                }
              }
              catch (error) {
                $scope.selectItems = [];
              }
              break;
            case 'custom':
              $scope.refreshItems = function() {
                try {
                  /* eslint-disable no-unused-vars */
                  var data = _.cloneDeep($scope.data);
                  /* eslint-enable no-unused-vars */
                  $scope.selectItems = eval('(function(data) { var values = [];' + settings.data.custom.toString() + '; return values; })(data)');
                }
                catch (error) {
                  $scope.selectItems = [];
                }
              };
              $scope.refreshItems();
              break;
            case 'url':
            case 'resource':
              var url = '';
              if (settings.dataSrc === 'url') {
                url = settings.data.url;
                if (url.substr(0, 1) === '/') {
                  url = Formio.getBaseUrl() + settings.data.url;
                }

                // Disable auth for outgoing requests.
                if (!settings.authenticate && url.indexOf(Formio.getBaseUrl()) === -1) {
                  options = {
                    disableJWT: true,
                    headers: {
                      Authorization: undefined,
                      Pragma: undefined,
                      'Cache-Control': undefined
                    }
                  };
                }
              }
              else {
                url = Formio.getBaseUrl();
                if (settings.data.project) {
                  url += '/project/' + settings.data.project;
                }
                url += '/form/' + settings.data.resource + '/submission';
              }

              options.params = {
                limit: 100,
                skip: 0
              };

              $scope.loadMoreItems = function($select, $event) {
                $event.stopPropagation();
                $event.preventDefault();
                options.params.skip += options.params.limit;
                $scope.refreshItems(null, null, true);
              };

              if (url) {
                $scope.selectLoading = false;
                $scope.hasNextPage = true;
                $scope.refreshItems = function(input, newUrl, append) {
                  newUrl = newUrl || url;
                  newUrl = $interpolate(newUrl)({
                    data: $scope.data,
                    formioBase: $rootScope.apiBase || 'https://api.form.io'
                  });
                  if (!newUrl) {
                    return;
                  }

                  // Do not want to call if it is already loading.
                  if ($scope.selectLoading) {
                    return;
                  }

                  // If this is a search, then add that to the filter.
                  if (settings.searchField && input) {
                    newUrl += ((newUrl.indexOf('?') === -1) ? '?' : '&') +
                      encodeURIComponent(settings.searchField) +
                      '=' +
                      encodeURIComponent(input);
                  }

                  // Add the other filter.
                  if (settings.filter) {
                    var filter = $interpolate(settings.filter)({data: $scope.data});
                    newUrl += ((newUrl.indexOf('?') === -1) ? '?' : '&') + filter;
                  }

                  // If they wish to return only some fields.
                  if (settings.selectFields) {
                    options.params.select = settings.selectFields;
                  }

                  // Set the new result.
                  var setResult = function(data) {
                    // coerce the data into an array.
                    if (!(data instanceof Array)) {
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

                  $scope.selectLoading = true;
                  $http.get(newUrl, options).then(function(result) {
                    var data = result.data;
                    if (data) {
                      // If the selectValue prop is defined, use it.
                      if (selectValues) {
                        setResult(_.get(data, selectValues, []));
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
                  })['finally'](function() {
                    $scope.selectLoading = false;
                  });
                };
                $scope.refreshItems();
              }
              break;
            default:
              $scope.selectItems = [];
          }
        }],
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'selectField',
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
