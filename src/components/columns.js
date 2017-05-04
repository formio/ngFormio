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
          var view = '<table class="table table-striped table-bordered"><thead><tr>';

          angular.forEach(component.columns, function() {
            view += '<th>Column (' + component.key + ')</th>';
          });
          view += '</tr></thead>';
          view += '<tbody>';
          view += '<tr>';

          angular.forEach(component.columns, function(column) {
            angular.forEach(column.components, function(component) {
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
            });
          });

          view += '</tr>';
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
