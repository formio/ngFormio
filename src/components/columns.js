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
          clearOnHide: false,
          label: 'Columns',
          hideLabel: true,
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
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';
          if (!options.tableChild) {
            view += '<thead><tr>';
          }

          var maxRows = 0;
          angular.forEach(options.component.columns, function(column, index) {
            // Get the maximum number of rows based on the number of components.
            maxRows = Math.max(maxRows, (column.components.length || 0));

            if (!options.tableChild) {
              // Add a header for each column.
              view += '<th>Column ' + (index + 1) + ' (' + options.component.key + ')</th>';
            }
          });

          if (!options.tableChild) {
            view += '</tr></thead>';
          }

          view += '<tbody>';
          for (var index = 0; index < maxRows; index++) {
            view += '<tr>';
            for (var col = 0; col < options.component.columns.length; col++) {
              view += GridUtils.columnForComponent(data, {
                component: options.component.columns[col].components[index] || undefined,
                $interpolate: options.$interpolate,
                componentInfo: options.componentInfo,
                tableChild: true,
                util: options.util
              });
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
