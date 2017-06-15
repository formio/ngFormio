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
          key: 'well',
          input: false,
          components: [],
          tableView: false
        },
        viewTemplate: 'formio/componentsView/well.html',
        tableView: function(data, component, $interpolate, componentInfo, tableChild) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!tableChild) {
            view += '<thead><tr>';
            view += '<th>Well (' + component.key + ')</th>';
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
      $templateCache.put('formio/components/well.html',
        fs.readFileSync(__dirname + '/../templates/components/well.html', 'utf8')
      );
      $templateCache.put('formio/componentsView/well.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/well.html', 'utf8')
      );
    }
  ]);
};
