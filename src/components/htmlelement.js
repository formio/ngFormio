var fs = require('fs');

module.exports = function(app) {
  app.directive('formioHtmlElement', [
    '$sanitize',
    '$filter',
    function($sanitize, $filter) {
      return {
        restrict: 'E',
        scope: {
          component: '='
        },
        templateUrl: 'formio/components/htmlelement-directive.html',
        link: function($scope) {
          if ($scope.options && $scope.options.building) return;
          var displayError = function(msg) {
            $scope.parseError = 'Invalid HTML: ' + msg.toString();
          };

          $scope.$watch('component', function createElement() {
            if (!$scope.component.tag) {
              return displayError('No tag given');
            }

            var element = angular.element('<' + $scope.component.tag + '>' + '</' + $scope.component.tag + '>');
            element.html($filter('formioTranslate')($scope.component.content));

            // Add the css classes if supplied.
            if ($scope.component.className) {
              element.attr('class', $scope.component.className);
            }

            angular.forEach($scope.component.attrs, function(attr) {
              if (!attr.attr) return;
              element.attr(attr.attr, attr.value);
            });

            try {
              $scope.html = $sanitize(element.prop('outerHTML'));
              $scope.parseError = null;

              // If the sanitized html is empty, it was invalid; Create a visible error so we still render something.
              if (!$scope.html) {
                return displayError(element.prop('outerHTML'));
              }
            }
            catch (err) {
              // Isolate the message and store it.
              $scope.parseError = err.message
                .split('\n')[0]
                .replace('[$sanitize:badparse]', '');
            }
          }, true);
        }
      };
  }]);

  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('htmlelement', {
        title: 'HTML Element',
        template: 'formio/components/htmlelement.html',
        viewTemplate: 'formio/components/htmlelement.html',
        settings: {
          key: 'html',
          label: 'Content',
          hideLabel: true,
          input: false,
          tag: 'p',
          attrs: [],
          className: '',
          content: ''
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/htmlelement.html',
        '<formio-html-element component="component"></div>'
      );

      $templateCache.put('formio/components/htmlelement-directive.html',
        fs.readFileSync(__dirname + '/../templates/components/htmlelement-directive.html', 'utf8')
      );
    }
  ]);
};
