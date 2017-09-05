var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('resource', {
        title: 'Resource',
        tableView: function(data, component, $interpolate) {
          if ($interpolate) {
            return $interpolate(component.template)({item: data});
          }

          return data ? data._id : '';
        },
        template: function($scope) {
          return $scope.component.multiple ? 'formio/components/resource-multiple.html' : 'formio/components/resource.html';
        },
        controller: ['$scope', 'Formio', 'ngDialog', '$location', function($scope, Formio, ngDialog, $location) {
          if ($scope.builder) return;
          var settings = $scope.component;
          var params = settings.params || {};
          $scope.selectItems = [];
          $scope.hasNextPage = false;
          $scope.resourceLoading = false;
          $scope.options = $scope.options || {};
          params.limit = 100;
          params.skip = 0;
          if (settings.multiple) {
            settings.defaultValue = [];
          }
          if (settings.resource) {
            var baseUrl = $scope.options.baseUrl || Formio.getBaseUrl();
            var url = baseUrl;
            if (settings.project) {
              url += '/project/' + settings.project;
            }
            else if ($scope.formio && $scope.formio.projectUrl) {
              url  = $scope.formio.projectUrl;
            }
            url += '/form/' + settings.resource;
            var formio = new Formio(url, {base: baseUrl});

            // Refresh the items.
            $scope.refreshSubmissions = function(input, append) {
              if ($scope.resourceLoading) {
                return;
              }
              $scope.resourceLoading = true;

              // If they wish to return only some fields.
              if (settings.selectFields) {
                params.select = settings.selectFields;
              }

              // If they wish to return only some submissions.
              var makeSelection = false;
              if (settings.searchFields && input) {
                angular.forEach(settings.searchFields, function(field) {
                  if (field === '_id') {
                    delete params[field];
                  }
                  else {
                    params[field] = input;
                  }
                });
              }
              else if (settings.searchFields && input === undefined) {
                var search = $location.search();
                angular.forEach(settings.searchFields, function(field) {
                  var key = $scope.component.key + '.' + field;
                  if (search[key]) {
                    params[field] = search[key];
                    makeSelection = true;
                  }
                });
              }

              // If not loading more then start from the beginning.
              if (!append) {
                params.skip = 0;
              }

              // Load the submissions.
              formio.loadSubmissions({
                params: params
              }).then(function(submissions) {
                submissions = submissions || [];
                if (append) {
                  $scope.selectItems = $scope.selectItems.concat(submissions);
                }
                else {
                  $scope.selectItems = submissions;
                  // If only one choice then select it.
                  if (makeSelection && submissions.length === 1) {
                    var component = $scope.component;
                    var data      = $scope.data;
                    if (component.multiple) {
                      data[component.key] = submissions;
                    }
                    else {
                      data[component.key] = submissions[0];
                    }
                  }
                }
                $scope.hasNextPage = (submissions.length >= params.limit) && ($scope.selectItems.length < submissions.serverCount);
              })['finally'](function() {
                $scope.resourceLoading = false;
              });
            };

            // Load more items.
            $scope.loadMoreItems = function($select, $event) {
              $event.stopPropagation();
              $event.preventDefault();
              params.skip += params.limit;
              $scope.refreshSubmissions(null, true);
            };

            $scope.refreshSubmissions();

            // Add a new resource.
            $scope.newResource = function() {
              var template  = '<br>' +
                              '<div class="row">' +
                                '<div class="col-sm-12">' +
                                  '<div class="panel panel-default">' +
                                    '<div class="panel-heading">' +
                                      '<h3 class="panel-title">{{ component.addResourceLabel || "Add Resource" | formioTranslate}}</h3>' +
                                    '</div>' +
                                    '<div class="panel-body">' +
                                      '<formio src="formUrl"></formio>' +
                                    '</div>' +
                                  '</div>' +
                                '</div>' +
                              '</div>';

              ngDialog.open({
                template: template,
                plain: true,
                scope: $scope,
                controller: ['$scope', function($scope) {
                  $scope.formUrl = $scope.formio.formsUrl + '/' + $scope.component.resource;

                  // Bind when the form is loaded.
                  $scope.$on('formLoad', function(event) {
                    event.stopPropagation(); // Don't confuse app
                  });

                  // Bind when the form is submitted.
                  $scope.$on('formSubmission', function(event, submission) {
                    var component = $scope.component;
                    var data      = $scope.data;

                    if (component.multiple) {
                      data[component.key].push(submission);
                    }
                    else {
                      data[component.key] = submission;
                    }

                    $scope.refreshSubmissions(null);
                    $scope.closeThisDialog(submission);
                  });
                }]
              }).closePromise.then(function(/*e*/) {
              //var cancelled = e.value === false || e.value === '$closeButton' || e.value === '$document';
              });
            };

            // Close all open dialogs on state change (using UI-Router).
            $scope.$on('$stateChangeStart', function() {
              ngDialog.closeAll(false);
            });

            // Close all open dialogs on route change (using ngRoute).
            $scope.$on('$routeChangeStart', function() {
              ngDialog.closeAll(false);
            });
          }
        }],
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'resourceField',
          placeholder: '',
          resource: '',
          project: '',
          defaultValue: '',
          template: '<span>{{ item.data }}</span>',
          selectFields: '',
          searchFields: '',
          multiple: false,
          protected: false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          validate: {
            required: false
          },
          defaultPermission: ''
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/resource.html',
        fs.readFileSync(__dirname + '/../templates/components/resource.html', 'utf8')
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/resource-multiple.html',
        $templateCache.get('formio/components/resource.html').replace(/<ui-select\s/g, '<ui-select multiple ')
      );
    }
  ]);
};
