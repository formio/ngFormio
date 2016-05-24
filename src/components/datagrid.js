var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('datagrid', {
        title: 'Data Grid',
        template: 'formio/components/datagrid.html',
        group: 'layout',
        tableView: function(data, component, $interpolate, componentInfo) {
          //var view = '<table class="table table-striped table-bordered">' +
          //  '<thead>' +
          //    '<tr>' +
          //      '<th ng-repeat="item in component.components track by $index">' +
          //        'item.label' +
          //      '</th>' +
          //    '</tr>' +
          //  '</thead>' +
          //  '<tbody>' +
          //    '<tr ng-repeat="row in data track by $index">' +
          //      '<td ng-repeat="item in component.components track by $index">' +
          //        '<div ng-if="component.components[$index][item.type] && component.components[$index][item.type].tableView">' +
          //          'component.components[$index][item.type].tableView' +
          //        '</div>' +
          //        '<div ng-if="!(component.components[$index][item.type] && component.components[$index][item.type].tableView)">' +
          //          'component.components[$index].prefix || ""' +
          //          'data[parent.$index][component.components[$index].key] || ""' +
          //          'component.components[$index].suffix || ""' +
          //        '</div>' +
          //      '</td>' +
          //    '</tr>' +
          //  '</tbody>' +
          //'</table>';
          //return view;


          var view = '<table class="table table-striped table-bordered"><thead><tr>';
          angular.forEach(component.components, function(component) {
            view += '<th>' + component.label + '</th>';
          });
          view += '</tr></thead>';
          view += '<tbody>';
          angular.forEach(data, function(row) {
            view += '<tr>';
            angular.forEach(component.components, function(component) {
              var info = componentInfo.components.hasOwnProperty(component.type) ? componentInfo.components[component.type] : {};
              if (info.tableView) {
                view += '<td>' + info.tableView(row[component.key] || '', component, $interpolate, componentInfo) + '</td>';
              }
              else {
                view += '<td>';
                if (component.prefix) {
                  view += component.prefix;
                }
                view += row[component.key] || '';
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
          tableView: true,
          label: '',
          key: 'datagrid',
          protected: false,
          persistent: true
        }
      });
    }
  ]);
  app.controller('formioDataGrid', [
    '$scope',
    function($scope) {
      // Make sure we have a data obj.
      $scope.data = $scope.data || {};
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [{}];

      // If the data is empty, add a first row.
      if ($scope.data[$scope.component.key].length === 0) {
        $scope.data[$scope.component.key].push({})
      }

      // Format the data for the html grid to use.
      $scope.rows = $scope.data[$scope.component.key];
      $scope.addRow = function(key) {
        // Ensure the object is initialized as it may be unset on a "Reset".
        if (!Array.isArray($scope.data[key])) {
          $scope.data[key] = [];
        }
        $scope.data[key].push({});
      };

      $scope.removeRow = function(index) {
        $scope.data[$scope.component.key].splice(index, 1);
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
