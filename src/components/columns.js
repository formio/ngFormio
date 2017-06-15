var fs = require('fs');
var GridUtils = require('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('columns', {
        title: 'Columns',
        template: 'formio/components/columns.html',
        group: 'layout',
        settings: {
          input: false,
          tableView: false,
          key: 'columns',
          columns: [{components: [], width: 6, offset: 0, push: 0, pull: 0},
                    {components: [], width: 6, offset: 0, push: 0, pull: 0}]
        },
        controller: ['$scope', function($scope) {
          // Adjust column component setting from before width, offset...
          if ($scope.component.columns.length   === 2
          &&  $scope.component.columns[0].width === undefined
          &&  $scope.component.columns[1].width === undefined) {
              $scope.component.columns[0].width   = 6;
              $scope.component.columns[0].offset  = 0;
              $scope.component.columns[0].push    = 0;
              $scope.component.columns[0].pull    = 0;
              $scope.component.columns[1].width   = 6;
              $scope.component.columns[1].offset  = 0;
              $scope.component.columns[1].push    = 0;
              $scope.component.columns[1].pull    = 0;
          }
        }],
        viewTemplate: 'formio/componentsView/columns.html',
        tableView: function(data, component, $interpolate, componentInfo, tableChild) {
          var view = '<table class="table table-striped table-bordered table-child">';
          if (!tableChild) {
            view += '<thead><tr>';
          }

          var maxRows = 0;
          angular.forEach(component.columns, function(column, index) {
            // Get the maximum number of rows based on the number of components.
            maxRows = Math.max(maxRows, (column.components.length || 0));

            if (!tableChild) {
              // Add a header for each column.
              view += '<th>Column ' + (index + 1) + ' (' + component.key + ')</th>';
            }
          });

          if (!tableChild) {
            view += '</tr></thead>';
          }

          view += '<tbody>';
          for (var index = 0; index < maxRows; index++) {
            view += '<tr>';
            for (var col = 0; col < component.columns.length; col++) {
              view += GridUtils.columnForComponent(data, component.columns[col].components[index] || undefined, $interpolate, componentInfo, true);
            }
            view += '</tr>';
          }
          view += '</tbody></table>';
          return view;
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/columns.html',
        fs.readFileSync(__dirname + '/../templates/components/columns.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/columns.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/columns.html', 'utf8')
      );
    }
  ]);
};
