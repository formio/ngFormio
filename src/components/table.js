var fs = require('fs');
var GridUtils = require('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('table', {
        title: 'Table',
        template: 'formio/components/table.html',
        group: 'layout',
        settings: {
          input: false,
          key: 'table',
          numRows: 3,
          numCols: 3,
          rows: [[{components: []}, {components: []}, {components: []}], [{components: []}, {components: []}, {components: []}], [{components: []}, {components: []}, {components: []}]],
          header: [],
          caption: '',
          striped: false,
          bordered: false,
          hover: false,
          condensed: false,
          tableView: false
        },
        tableView: function(data, component, $interpolate, componentInfo, tableChild) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!tableChild) {
            view += '<thead>';
            view += '<tr><th>Table (' + component.key + ')</th></tr>';
            view += '</thead>';
          }

          view += '<tbody>';

          for (var row = 0; row < component.numRows; row++) {
            view += '<tr>';
            for (var col = 0; col < component.numCols; col++) {
              view += '<td>';
              // Each column is its own table.
              view += '<table class="table table-striped table-bordered table-child">';
              view += '<tbody>';
              angular.forEach(component.rows[row][col].components, function(component) {
                view += '<tr>' + GridUtils.columnForComponent(data, component, $interpolate, componentInfo) + '</tr>';
              });

              view += '</tbody></table>';
              view += '</td>';
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
      var tableClasses = "{'table-striped': component.striped, ";
      tableClasses += "'table-bordered': component.bordered, ";
      tableClasses += "'table-hover': component.hover, ";
      tableClasses += "'table-condensed': component.condensed}";
      $templateCache.put('formio/components/table.html',
        fs.readFileSync(__dirname + '/../templates/components/table.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/table.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/table.html', 'utf8')
      );
    }
  ]);
};
