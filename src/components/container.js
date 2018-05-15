var fs = require('fs');
var GridUtils = require('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('container', {
        title: 'Container',
        template: 'formio/components/container.html',
        viewTemplate: 'formio/componentsView/container.html',
        group: 'advanced',
        icon: 'fa fa-folder-open',
        tableView: function(data, options) {
          var view = '<table class="table table-striped table-bordered table-child">';

          if (!options.tableChild) {
            view += '<thead><tr>';
            view += '<th>' + (options.component.label || '') + ' (' + options.component.key + ')</th>';
            view += '</tr></thead>';
          }

          view += '<tbody>';

          // Render a value for each column item.
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
        },
        settings: {
          input: true,
          tree: true,
          components: [],
          tableView: true,
          label: '',
          key: 'container',
          protected: false,
          persistent: true,
          clearOnHide: true
        }
      });
    }
  ]);
  app.controller('formioContainerComponent', [
    '$scope',
    function($scope) {
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || {};
      $scope.parentKey = $scope.component.key;
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/container.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/container.html', 'utf8')
      ));
    }
  ]);
};
