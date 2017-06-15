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
          key: 'panel',
          input: false,
          title: '',
          theme: 'default',
          tableView: false,
          components: []
        },
        viewTemplate: 'formio/componentsView/panel.html',
        tableView: function(data, component, $interpolate, componentInfo, tableChild) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!tableChild) {
            view += '<thead><tr>';
            view += '<th>Panel (' + component.key + ')</th>';
            view += '</tr></thead>';
          }
          view += '<tbody>';
          angular.forEach(component.components, function(component) {
            view += '<tr>' + GridUtils.columnForComponent(data, component, $interpolate, componentInfo, true) + '</tr>';
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
