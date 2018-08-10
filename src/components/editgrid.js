var fs = require('fs');
var formioUtils = require('formiojs/utils').default;

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('editgrid', {
        title: 'Edit Grid',
        template: 'formio/components/editgrid.html',
        group: 'advanced',
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!options.tableChild) {
            view += '<thead><tr>';
            angular.forEach(options.component.components, function(component) {
              view += '<th>' + (component.label || '') + ' (' + component.key + ')</th>';
            });
            view += '</tr></thead>';
          }

          view += '<tbody>';
          angular.forEach(data, function(row) {
            view += '<tr>';
            formioUtils.eachComponent(options.component.components, function(component) {
              // Don't render disabled fields, or fields with undefined data.
              if (!component.tableView || !row || row[component.key] === undefined) {
                return;
              }

              // If the component has a defined tableView, use that, otherwise try and use the raw data as a string.
              var info = options.componentInfo.components.hasOwnProperty(component.type)
                ? options.componentInfo.components[component.type]
                : {};
              if (info.tableView) {
                // Reset the tableChild value for datagrids, so that components have headers.
                view += '<td>' + info.tableView((row && row[component.key]) || '', {
                  component: component,
                  $interpolate: options.$interpolate,
                  componentInfo: options.componentInfo,
                  tableChild: false,
                  util: options.util
                }) + '</td>';
              }
              else {
                view += '<td>';
                if (component.prefix) {
                  view += component.prefix;
                }
                view += (row && row[component.key]) || '';
                if (component.suffix) {
                  view += ' ' + component.suffix;
                }
                view += '</td>';
              }
            });
            view += '</tr>';
          });
          view += '</tbody></table>';
          return view;
        },
        settings: {
          input: true,
          tree: true,
          components: [],
          multiple: false,
          tableView: true,
          label: 'Edit Grid',
          key: 'editgrid',
          protected: false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          templates: {
            header: '' +
              '<div class="row"> \n' +
              '  {%util.eachComponent(components, function(component) { %} \n' +
              '    <div class="col-sm-2"> \n' +
              '      {{ component.label }} \n' +
              '    </div> \n' +
              '  {% }) %} \n' +
              '</div>',
            row: '' +
              '<div class="row"> \n' +
              '  {%util.eachComponent(components, function(component) { %} \n' +
              '    <div class="col-sm-2"> \n' +
              '      {{ getView(component, row[component.key]) }} \n' +
              '    </div> \n' +
              '  {% }) %} \n' +
              '  <div class="col-sm-2"> \n' +
              '    <div class="btn-group pull-right"> \n' +
              '      <div class="btn btn-default editRow">Edit</div> \n' +
              '      <div class="btn btn-danger removeRow">Delete</div> \n' +
              '    </div> \n' +
              '  </div> \n' +
              '</div>',
            footer: ''
          }
        }
      });
    }
  ]);
  app.directive('editgridValidation', function() {
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function(scope, elem, attr, ctrl) {
        if (scope.options && scope.options.building || !scope.formioForm) return;

        // Add the control to the main form.
        scope.formioForm.$addControl(ctrl);

        ctrl.$validators.editgrid = function(modelValue, viewValue) {
          if (scope.openRows && scope.openRows.length) {
            return false;
          }
          return true;
        };
      }
    }
  });
  app.directive('editgridRowValidation', function() {
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function(scope, elem, attr, ctrl) {
        if (scope.options && scope.options.building) return;

        // Add the control to the main form.
        scope.formioForm.$addControl(ctrl);

        var _get = function(item, path, def) {
          if (!item) {
            return def || undefined;
          }
          if (!path) {
            return item;
          }

          // If the path is a string, turn it into an array.
          if (typeof path === 'string') {
            path = path.split('.');
          }
          // If the path is an array, take the first element, and recurse its path
          if (path instanceof Array) {
            var current = path.shift();
            if (item.hasOwnProperty(current)) {
              // If there are no more path items, stop here.
              if (path.length === 0) {
                return item[current];
              }

              return _get(item[current], path);
            }

            return undefined;
          }

          return undefined;
        };

        ctrl.$validators.editgridrow = function(modelValue, viewValue) {
          var valid = true;
          /*eslint-disable no-unused-vars */
          if (scope.component.validate && scope.component.validate.row) {
            var input = modelValue || viewValue;

            // FOR-255 - Enable row data and form data to be visible in the validator.
            var data = scope.submission.data;
            var row = scope.row;
            /*eslint-enable no-unused-vars */

            var component = scope.component;
            var custom = scope.component.validate.row;
            custom = custom.replace(/({{\s{0,}(.*[^\s]){1}\s{0,}}})/g, function(match, $1, $2) {
              return _get(scope.submission.data, $2);
            });

            try {
              /* jshint evil: true */
              eval(custom);
            }
            catch (err) {
              valid = err.message;
            }

            if (valid !== true) {
              return false;
            }
          }

          return true;
        };
      }
    }
  });
  app.directive('renderTemplate', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        template: '=',
        data: '=',
        actions: '='
      },
      link: function(scope, element, attrs) {
        scope.$watch('data', function() {
          // Render template and set in element's innerHTML.
          element.html(formioUtils.interpolate(scope.template, scope.data));
          // Add actions to child elements with classes.
          if (scope.actions && scope.actions.length) {
            scope.actions.forEach(function(action) {
              var elements = element.find('.' + action.class);
              elements.each(function(index, element) {
                element.addEventListener(action.event, action.action);
              });
            });
          }
        })
      }
    }
  });
  app.directive('editGridRow', function() {
    return {
      restict: 'E',
      require: 'ngModel',
      scope: false,
      controller: [
        '$scope',
        '$interpolate',
        'formioComponents',
        'FormioUtils',
        function(
          $scope,
          $interpolate,
          formioComponents,
          FormioUtils
        ) {
          $scope.$watchCollection('rows', function() {
            $scope.rowData = angular.copy($scope.rows[$scope.rowIndex]);
            $scope.templateData = {
              data: $scope.submission.data,
              row: $scope.rowData,
              rowIndex: $scope.rowIndex,
              components: $scope.component.components,
              getView: function(component, data) {
                var info = formioComponents.components[component.type] || {};
                if (info.tableView) {
                  return info.tableView(data || '', {
                    component: component,
                    $interpolate: $interpolate,
                    componentInfo: formioComponents,
                    tableChild: false,
                    util: FormioUtils
                  });
                }
                else {
                  var view = '';

                  if (component.prefix) {
                    view += component.prefix;
                  }
                  view += data || '';
                  if (component.suffix) {
                    view += ' ' + component.suffix;
                  }

                  return view;
                }
              },
              util: formioUtils
            };
          });
          $scope.editDone = function(form) {
            if (!form.$valid) {
              form.$setDirty(true);
              for (var key in form) {
                if (form[key] && form[key].hasOwnProperty('$pristine')) {
                  form[key].$setDirty(true);
                }
                if (form[key] && form[key].$validate) {
                  form[key].$validate();
                }
              }
              return;
            }
            $scope.rows[$scope.rowIndex] = $scope.rowData;
            $scope.openRows.splice($scope.openRows.indexOf($scope.rowIndex), 1);
            $scope.formioForm[$scope.componentId].$validate();
          }

          var editRow = function() {
            $scope.openRows.push($scope.rowIndex);
            $scope.$apply();
          }
          var removeRow = function() {
            $scope.removeRow($scope.rowIndex);
            $scope.$apply();
          }
          $scope.actions = [
            {
              class: 'removeRow',
              event: 'click',
              action: removeRow
            },
            {
              class: 'editRow',
              event: 'click',
              action: editRow
            }
          ]
        }
      ],
      template: '' +
      '<div ng-if="openRows.indexOf(rowIndex) !== -1">' +
      '  <div class="edit-body {{component.rowClass}}">' +
      '    <div class="editgrid-edit">' +
      '      <div class="editgrid-body">' +
      '        <ng-form name="formioForm">' +
      '          <formio-component' +
      '            ng-repeat="col in component.components track by $index"' +
      '            ng-init="colIndex = $index"' +
      '            component="col"' +
      '            data="rowData"' +
      '            formio="formio"' +
      '            submission="submission"' +
      '            hide-components="hideComponents"' +
      '            ng-if="options.building ? \'::true\' : isVisible(col, rowData)"' +
      '            form-name="formName"' +
      '            read-only="isDisabled(col, rowData)"' +
      '            grid-row="rowIndex"' +
      '            grid-col="colIndex"' +
      '            options="options"' +
      '          />' +
      '        </ng-form>' +
      '        <div class="editgrid-actions">' +
      '          <div ng-click="editDone(formioForm)" class="btn btn-primary">{{ component.saveRow || \'Save\' }}</div>' +
      '          <div ng-if="component.removeRow" ng-click="removeRow(rowIndex)" class="btn btn-danger">{{component.removeRow || \'Cancel\' }}</div>' +
      '        </div> ' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '<div ng-if="openRows.indexOf(rowIndex) === -1">' +
      '  <render-template template="component.templates.row" data="templateData" actions="actions"/>' +
      '</div>'
    }
  });
  app.controller('formioEditGrid', [
    '$scope',
    'FormioUtils',
    function($scope, FormioUtils) {
      if ($scope.options && $scope.options.building) return;
      // Ensure each data grid has a valid data model.
      $scope.data = $scope.data || {};
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [];
      $scope.$watch('data.' + $scope.component.key, function() {
        $scope.headerData = {
          components: $scope.cols,
          value: $scope.data[$scope.component.key],
          util: formioUtils,
          data: $scope.data
        };
      }, true);

      $scope.openRows = [];

      // Determine if any component is visible.
      $scope.anyVisible = function(component) {
        var data = $scope.data[$scope.component.key];
        var visible = false;
        angular.forEach(data, function(rowData) {
          visible = (visible || FormioUtils.isVisible(component, rowData, $scope.data, $scope.hideComponents));
        });
        return visible;
      };

      // Pull out the rows and cols for easy iteration.
      $scope.rows = $scope.data[$scope.component.key];
      // If less than minLength, add that many rows.
      if ($scope.component.validate && $scope.component.validate.hasOwnProperty('minLength') && $scope.rows.length < $scope.component.validate.minLength) {
        var toAdd = $scope.component.validate.minLength - $scope.rows.length;
        for (var i = 0; i < toAdd; i++) {
          $scope.rows.push({});
        }
      }
      // If more than maxLength, remove extra rows.
      if ($scope.component.validate && $scope.component.validate.hasOwnProperty('maxLength') && $scope.rows.length < $scope.component.validate.maxLength) {
        $scope.rows = $scope.rows.slice(0, $scope.component.validate.maxLength);
      }
      $scope.cols = $scope.component.components;
      $scope.localKeys = $scope.component.components.map(function(component) {
        return component.key;
      });

      // Add a row the to grid.
      $scope.addRow = function() {
        if (!Array.isArray($scope.rows)) {
          $scope.rows = [];
        }
        $scope.openRows.push($scope.rows.length);
        $scope.rows.push({});
      };

      // Remove a row from the grid.
      $scope.removeRow = function(index) {
        // Make sure to close if it is open.
        if ($scope.openRows.indexOf(index) !== -1) {
          $scope.openRows.splice($scope.openRows.indexOf(index), 1);
        }
        $scope.rows.splice(index, 1);
      };
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/editgrid.html', fs.readFileSync(__dirname + '/../templates/components/editgrid.html', 'utf8'));
    }
  ]);
};
