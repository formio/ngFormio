var fs = require('fs');
var formioUtils = require('formiojs/utils').default;

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('datagrid', {
        title: 'Data Grid',
        template: 'formio/components/datagrid.html',
        group: 'advanced',
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!options.tableChild) {
            view += '<thead><tr>';
            angular.forEach(options.component.components, function(component) {
              view += '<th>' + (component.label || '( '+component.key+')')+'</th>';
            });
            view += '</tr></thead>';
          }

          view += '<tbody>';
          angular.forEach(data, function(row) {
            view += '<tr>';
            formioUtils.eachComponent(options.component.components, function(component) {
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
          autofocus: false,
          input: true,
          tree: true,
          components: [],
          tableView: true,
          label: 'Data Grid',
          key: 'datagrid',
          protected: false,
          persistent: true,
          hidden: false,
          clearOnHide: true
        }
      });
    }
  ]);
  app.controller('formioDataGrid', [
    '$scope',
    'FormioUtils',
    function($scope, FormioUtils) {
      if ($scope.options && $scope.options.building) return;
      // Ensure each data grid has a valid data model.
      $scope.data = $scope.data || {};
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [{}];

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
      if ($scope.component.validate && $scope.component.validate.hasOwnProperty('maxLength') && $scope.rows.length > $scope.component.validate.maxLength) {
        $scope.rows.splice($scope.component.validate.maxLength);
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
        $scope.rows.push({});
      };

      // Remove a row from the grid.
      $scope.removeRow = function(index) {
        $scope.rows.splice(index, 1);
      };
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/datagrid.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/datagrid.html', 'utf8')
      ));
    }
  ]);
};
