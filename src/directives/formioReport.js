import { Formio } from '@formio/js/sdk';
const app = angular.module('formio');
export default app.directive('formioReport', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      projectEndpoint: '=?',
      report: '=?',
      readOnly: '=?',
      noSubmit: '=?',
      options: '<?'
    },
    link: function (scope, element) {
      scope.element = element[0];
      scope.formioReady = false;
      scope.initialized = false;
      scope.options = scope.options || {};
      scope.noSubmit = !!scope.noSubmit;
    },
    controller: [
      '$scope',
      '$q',
      function ($scope, $q) {
        $scope.onLoad = $q.defer();
        $scope.onFormio = $scope.onLoad.promise;
        $scope.initializeReport = function() {
          if (!$scope.element) {
            return;
          }

          // Set read only if using legacy option.
          if (!$scope.options.hasOwnProperty('readOnly') && $scope.readOnly !== undefined) {
            $scope.options.readOnly = $scope.readOnly;
          }

          // Add the live form parameter to the url.
          if ($scope.src && ($scope.src.indexOf('live=') === -1)) {
            $scope.src += ($scope.src.indexOf('?') === -1) ? '?' : '&';
            $scope.src += 'live=1';
          }

          if ($scope.src || $scope.report) {
            $scope.initialized = true;

            if ($scope.projectEndpoint) {
              $scope.options.projectEndpoint = $scope.projectEndpoint;
            }

            const formioReport = Formio.Report;

            if (formioReport && formioReport.create){
              formioReport.create($scope.element, $scope.src || $scope.report, _.cloneDeep($scope.options)).then(formio => {
                formio.nosubmit = $scope.noSubmit;
                $scope.$emit('formLoad', formio.form);
                $scope.formio = formio;
                $scope.setupReport();
              });
            }
          }
        };

        $scope.setupReport = function() {
          if ($scope.projectEndpoint) {
            $scope.formio.nosubmit = $scope.noSubmit || false;
          }
          $scope.formio.events.onAny(function() {
            // Keep backwards compatibility by firing old events as well.
            const args = Array.prototype.slice.call(arguments);

            const eventParts = args[0].split('.');

            let shouldFire = true;

            // Only handle formio events.
            if (eventParts[0] !== 'formio' || eventParts.length !== 2) {
              return;
            }

            // Remove formio. from event.
            args[0] = eventParts[1];
            switch(eventParts[1]) {
              case 'error':
                args[0] = 'formError';
                break;
              case 'customEvent':
                args[0] = args[1].type;
                //prevent customEvent from firing when it's emitted by button with event action (as it is emitted twice)
                if (args[1].component && args[1].component.type === 'button' && args[1].component.action === 'event') {
                  shouldFire = false;
                }
                break;
            }

            if (shouldFire) {
              $scope.$emit.apply($scope, args);
            }
          });

          $scope.formioReady = true;
          $scope.onLoad.resolve($scope.formio);
          return $scope.formio;
        };

        $scope.$watch('src', src => {
          if (!src) {
            return;
          }
          $scope.initialized = false;
          $scope.initializeReport();
        });

        $scope.$watch('projectEndpoint', url => {
          if (!url) {
            return;
          }
          if ($scope.formioReady) {
            $scope.formio.url =  `${url}/project/${$scope.report && $scope.report.project}`;
            $scope.formio.nosubmit = $scope.noSubmit || false;
          }
          else if (!$scope.initialized) {
            $scope.initializeReport();
          }
          else {
            $scope.onFormio.then(() => {
              $scope.formio.url =  `${url}/project/${$scope.report && $scope.report.project}`;
              $scope.formio.nosubmit = $scope.noSubmit || false;
            });
          }
        });

        $scope.$watch('report', report => {
          if (!report) {
            return;
          }
          if ($scope.formioReady) {
            $scope.formio.form = {components: [], report};
          }
          else if (!$scope.initialized) {
            $scope.initializeReport();
          }
          else {
            $scope.onFormio.then(() => ($scope.formio.form = {components: [], report}));
          }
        }, true);

        // Clean up the Report Form from DOM.
        $scope.$on('$destroy', function () {
          if ($scope.formio) {
            $scope.formio.destroy(true);
          }
        });

        // Initialize the form.
        $scope.initializeReport();
      }
    ],
    template: '<div />'
  };
});
