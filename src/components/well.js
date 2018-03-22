var fs = require('fs');
var GridUtils = require('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('well', {
        title: 'Well',
        template: 'formio/components/well.html',
        group: 'layout',
        settings: {
          clearOnHide: false,
          hideLabel: true,
          key: 'well',
          input: false,
          components: [],
          tableView: false
        },
        viewTemplate: 'formio/componentsView/well.html',
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!options.tableChild) {
            view += '<thead><tr>';
            view += '<th>Well (' + options.component.key + ')</th>';
            view += '</tr></thead>';
          }
          view += '<tbody>';
          angular.forEach(options.component.components, function(component) {
            view += '<tr>' + GridUtils.columnForComponent(data, {
              component: component,
              $interpolate: options.$interpolate,
              componentInfo: options.componentInfo,
              tableChild: true,
              util: options.util
            }) + '</tr>';
          });

          view += '</tbody></table>';
          return view;
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/well.html',
        fs.readFileSync(__dirname + '/../templates/components/well.html', 'utf8')
      );
      $templateCache.put('formio/componentsView/well.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/well.html', 'utf8')
      );
    }
  ]);
};
