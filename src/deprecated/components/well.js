var GridUtils = require('./GridUtils')();

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
        require('./templates/well.html')
      );
    }
  ]);
};
