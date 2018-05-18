var fs = require('fs');
var GridUtils = require('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('panel', {
        title: 'Panel',
        template: 'formio/components/panel.html',
        group: 'layout',
        settings: {
          clearOnHide: false,
          key: 'panel',
          input: false,
          title: '',
          theme: 'default',
          tableView: false,
          hideLabel: false,
          components: []
        },
        viewTemplate: 'formio/componentsView/panel.html',
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!options.tableChild) {
            view += '<thead><tr>';
            view += '<th>Panel (' + options.component.key + ')</th>';
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
      $templateCache.put('formio/components/panel.html',
        fs.readFileSync(__dirname + '/../templates/components/panel.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/panel.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/panel.html', 'utf8')
      );
    }
  ]);
};
