var fs = require('fs');

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
        tableView: function(data, component, $interpolate, componentInfo) {
          var view = '<table class="table table-striped table-bordered"><thead><tr>';
          angular.forEach(component.components, function(component) {
            view += '<th>' + component.label + '</th>';
          });
          view += '</tr></thead>';
          view += '<tbody>';
          view += '<tr>';
          angular.forEach(component.components, function(component) {
            var info = componentInfo.components.hasOwnProperty(component.type) ? componentInfo.components[component.type] : {};
            if (info.tableView) {
              view += '<td>' +
                info.tableView(
                  data && component.key && data.hasOwnProperty(component.key) ? data[component.key] : '',
                  component,
                  $interpolate,
                  componentInfo
                ) + '</td>';
              return;
            }

            view += '<td>';
            if (component.prefix) {
              view += component.prefix;
            }
            view += data && component.key && data.hasOwnProperty(component.key) ? data[component.key] : '';
            if (component.suffix) {
              view += ' ' + component.suffix;
            }
            view += '</td>';
          });
          view += '</tr>';
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
