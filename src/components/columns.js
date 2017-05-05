var fs = require('fs');
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
          tableView: true,
          key: 'columns',
          columns: [{components: []}, {components: []}]
        },
        viewTemplate: 'formio/componentsView/columns.html',
        tableView: function(data, component, $interpolate, componentInfo) {
          // Generate a column for the component.
          var columnForComponent = function(component) {
            // If no component is given, generate an empty cell.
            if (!component) {
              return '<td></td>';
            }

            // Generate a table for each component with one column to display the key/value for each component.
            var view = '<td>';
            view += '<table class="table table-striped table-bordered"><thead><tr>';

            // Add a header for each component.
            view += '<th>' + (component.label || '') + ' (' + component.key + ')</th>';
            view += '</tr></thead>';
            view += '<tbody>';

            // If the component has a defined tableView, use that, otherwise try and use the raw data as a string.
            var info = componentInfo.components.hasOwnProperty(component.type)
              ? componentInfo.components[component.type]
              : {};
            if (info.tableView) {
              view += '<td>' +
                info.tableView(
                  data && component.key && (data.hasOwnProperty(component.key) ? data[component.key] : ''),
                  component,
                  $interpolate,
                  componentInfo
                ) + '</td>';
            }
            else {
              view += '<td>';
              if (component.prefix) {
                view += component.prefix;
              }
              view += data && component.key && (data.hasOwnProperty(component.key) ? data[component.key] : '');
              if (component.suffix) {
                view += ' ' + component.suffix;
              }
              view += '</td>';
            }

            view += '</tbody></table>';
            view += '</td>';
            return view;
          };

          var view = '<table class="table table-striped table-bordered"><thead><tr>';
          var maxRows = 0;

          angular.forEach(component.columns, function(column, index) {
            // Get the maximum number of rows based on the number of components.
            maxRows = Math.max(maxRows, (column.components.length || 0));

            // Add a header for each column.
            view += '<th>Column ' + (index + 1) + ' (' + component.key + ')</th>';
          });
          view += '</tr></thead>';
          view += '<tbody>';

          for (var index = 0; index < maxRows; index++) {
            view += '<tr>';
            for (var col = 0; col < component.columns.length; col++) {
              view += columnForComponent(component.columns[col].components[index] || undefined);
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
