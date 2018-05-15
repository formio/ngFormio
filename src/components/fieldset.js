var fs = require('fs');
var GridUtils = require('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('fieldset', {
        title: 'Field Set',
        template: 'formio/components/fieldset.html',
        group: 'layout',
        settings: {
          clearOnHide: false,
          key: 'fieldset',
          input: false,
          tableView: false,
          legend: '',
          hideLabel: true,
          components: []
        },
        viewTemplate: 'formio/componentsView/fieldset.html',
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!options.tableChild) {
            view += '<thead><tr>';
            view += '<th>Field Set (' + options.component.key + ')</th>';
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
      $templateCache.put('formio/components/fieldset.html',
        fs.readFileSync(__dirname + '/../templates/components/fieldset.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/fieldset.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/fieldset.html', 'utf8')
      );
    }
  ]);
};
