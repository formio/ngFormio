var fs = require('fs');
var _merge = require('lodash/merge');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('button', {
        title: 'Button',
        template: 'formio/components/button.html',
        settings: {
          autofocus: false,
          input: true,
          label: 'Submit',
          tableView: false,
          key: 'submit',
          size: 'md',
          leftIcon: '',
          rightIcon: '',
          block: false,
          action: 'submit',
          disableOnInvalid: false,
          theme: 'primary'
        },
        controller: ['$scope', '$location', 'FormioUtils', function($scope, $location, FormioUtils) {
          if ($scope.options && $scope.options.building) return;
          var clicked = false;
          var settings = $scope.component;
          $scope.getButtonType = function() {
            switch (settings.action) {
              case 'submit':
              case 'saveState':
                return 'submit';
              case 'reset':
                return 'reset';
              case 'event':
              case 'custom':
              case 'oauth':
              case 'url':
              case 'delete':
              default:
                return 'button';
            }
          };

          $scope.hasError = function() {
            if (clicked && (settings.action === 'submit') && $scope.formioForm.$invalid) {
              $scope.disableBtn = true;
              return true;
            }
            else {
              clicked = false;
              $scope.disableBtn = false;
              return false;
            }
          };

          var onCustom = function() {
            try {
              var parent = $scope.$parent;
              while (!parent.form) {
                parent = parent.$parent;
              }
              var flattened = FormioUtils.flattenComponents(parent.form.components, true);
              var components = flattened;
              (new Function('form', 'flattened', 'components', '_merge', '$scope', 'data', 'row', $scope.component.custom.toString()))
              (parent.form, flattened, components, _merge, $scope, $scope.data, $scope.data);
            }
            catch (e) {
              /* eslint-disable no-console */
              console.warn('An error occurred evaluating custom logic for ' + $scope.component.key, e);
              /* eslint-enable no-console */
            }
          };

          var onClick = function() {
            clicked = true;

            $scope.data[$scope.component.key] = true;
            switch (settings.action) {
              case 'submit':
                $scope.submission.state = 'submitted';
                return;
              case 'saveState':
                $scope.submission.state = $scope.component.state;
                return;
              case 'event':
                $scope.$emit($scope.component.event, $scope.data);
                break;
              case 'custom':
                onCustom();
                break;
              case 'url':
                $scope.$emit('submitUrl',{url:$scope.component.url, component: $scope.component});
                break;
              case 'reset':
                $scope.resetForm();
                break;
              case 'delete':
                $scope.deleteSubmission();
                break;
              case 'oauth':
                if (!settings.oauth) {
                  $scope.showAlerts({
                    type: 'danger',
                    message: 'You must assign this button to an OAuth action before it will work.'
                  });
                  break;
                }
                if (settings.oauth.error) {
                  $scope.showAlerts({
                    type: 'danger',
                    message: settings.oauth.error
                  });
                  break;
                }
                $scope.openOAuth(settings.oauth);
                break;
            }
          };

          $scope.$on('buttonClick', function(event, component, componentId) {
            // Ensure the componentId's match (even though they always should).
            if (componentId !== $scope.componentId) {
              return;
            }
            onClick();
          });

          $scope.openOAuth = function(settings) {
            /*eslint-disable camelcase */
            var params = {
              response_type: 'code',
              client_id: settings.clientId,
              redirect_uri: window.location.origin || window.location.protocol + '//' + window.location.host,
              state: settings.state,
              scope: settings.scope
            };
            /*eslint-enable camelcase */

            // Make display optional.
            if (settings.display) {
              params.display = settings.display;
            }
            params = Object.keys(params).map(function(key) {
              return key + '=' + encodeURIComponent(params[key]);
            }).join('&');

            var url = settings.authURI + '?' + params;

            // TODO: make window options from oauth settings, have better defaults
            var popup = window.open(url, settings.provider, 'width=1020,height=618');
            var interval = setInterval(function() {
              try {
                var popupHost = popup.location.host;
                var currentHost = window.location.host;
                if (popup && !popup.closed && popupHost === currentHost && popup.location.search) {
                  popup.close();
                  var params = popup.location.search.substr(1).split('&').reduce(function(params, param) {
                    var split = param.split('=');
                    params[split[0]] = split[1];
                    return params;
                  }, {});
                  if (params.error) {
                    $scope.showAlerts({
                      type: 'danger',
                      message: params.error_description || params.error
                    });
                    return;
                  }
                  // TODO: check for error response here
                  if (settings.state !== params.state) {
                    $scope.showAlerts({
                      type: 'danger',
                      message: 'OAuth state does not match. Please try logging in again.'
                    });
                    return;
                  }
                  var submission = {data: {}, oauth: {}};
                  submission.oauth[settings.provider] = params;
                  submission.oauth[settings.provider].redirectURI = window.location.origin || window.location.protocol + '//' + window.location.host;
                  $scope.formioForm.submitting = true;
                  $scope.formio.saveSubmission(submission)
                  .then(function(submission) {
                    // Trigger the form submission.
                    $scope.$emit('formSubmission', submission);
                  })
                  .catch(function(error) {
                    $scope.showAlerts({
                      type: 'danger',
                      message: error.message || error
                    });
                  })
                  .finally(function() {
                    $scope.formioForm.submitting = false;
                  });
                }
              }
              catch (error) {
                if (error.name !== 'SecurityError') {
                  $scope.showAlerts({
                    type: 'danger',
                    message: error.message || error
                  });
                }
              }
              if (!popup || popup.closed || popup.closed === undefined) {
                clearInterval(interval);
              }
            }, 100);
          };

          // If this is an OpenID Provider initiated login, perform the click event immediately
          if (
            settings.action === 'oauth' &&
            settings.oauth &&
            settings.oauth.authURI &&
            settings.oauth.authURI.indexOf($location.search().iss) === 0
          ) {
            $scope.openOAuth(settings.oauth);
          }
        }],
        viewTemplate: 'formio/componentsView/button.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/button.html',
        fs.readFileSync(__dirname + '/../templates/components/button.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/button.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/button.html', 'utf8')
      );
    }
  ]);
};
