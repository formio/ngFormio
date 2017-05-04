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
          key: 'columns',
          columns: [{components: [], width: 6, offset: 0, push: 0, pull: 0},
                    {components: [], width: 6, offset: 0, push: 0, pull: 0}]
        },
        controller: ['$scope', function($scope) {
          // Adjust column component setting from before width, offset...
          if ($scope.component.columns.length   === 2
          &&  $scope.component.columns[0].width === undefined
          &&  $scope.component.columns[1].width === undefined) {
              $scope.component.columns[0].width   = 6;
              $scope.component.columns[0].offset  = 0;
              $scope.component.columns[0].push    = 0;
              $scope.component.columns[0].pull    = 0;
              $scope.component.columns[1].width   = 6;
              $scope.component.columns[1].offset  = 0;
              $scope.component.columns[1].push    = 0;
              $scope.component.columns[1].pull    = 0;
          }
        }],
        viewTemplate: 'formio/componentsView/columns.html'
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
