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
          clearOnHide: false,
          hideLabel: true,
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
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!options.tableChild) {
            view += '<thead>';
            view += '<tr><th>Table (' + options.component.key + ')</th></tr>';
            view += '</thead>';
          }

          view += '<tbody>';

          for (var row = 0; row < options.component.numRows; row++) {
            view += '<tr>';
            for (var col = 0; col < options.component.numCols; col++) {
              view += '<td>';
              // Each column is its own table.
              view += '<table class="table table-striped table-bordered table-child">';
              view += '<tbody>';
              angular.forEach(options.component.rows[row][col].components, function(component) {
                view += '<tr>' + GridUtils.columnForComponent(data, {
                  component: component,
                  $interpolate: options.$interpolate,
                  componentInfo: options.componentInfo,
                  util: options.util
                }) + '</tr>';
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
