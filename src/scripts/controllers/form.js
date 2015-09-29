'use strict';

/* global _: false */

var app = angular.module('formioApp.controllers.form', [
  'ngDialog',
  'ui.sortable',
  'ui.bootstrap.tabs',
  'ui.bootstrap.tpls',
  'ui.bootstrap.accordion',
  'ngFormBuilder',
  'formio',
  'bgf.paginateAnything'
]);

app.config([
  '$stateProvider',
  function(
    $stateProvider
  ) {
    $stateProvider
      .state('project.form', {
        abstract: true,
        url: '/form/:formId',
        parent: 'project',
        templateUrl: 'views/form/form.html',
        controller: 'FormController'
      })
      .state('project.form.view', {
        url: '',
        parent: 'project.form',
        templateUrl: 'views/form/form-view.html'
      })
      .state('project.form.edit', {
        url: '/edit',
        parent: 'project.form',
        controller: 'FormEditController',
        templateUrl: 'views/form/form-edit.html'
      })
      .state('project.form.delete', {
        url: '/delete',
        parent: 'project.form',
        controller: 'FormDeleteController',
        templateUrl: 'views/form/form-delete.html'
      })
      .state('project.form.createForm', {
        url: '/create/form',
        parent: 'project',
        templateUrl: 'views/form/form-edit.html',
        controller: 'FormController',
        params: {formType: 'form'}
      })
      .state('project.form.createResource', {
        url: '/create/resource',
        parent: 'project',
        templateUrl: 'views/form/form-edit.html',
        controller: 'FormController',
        params: {formType: 'resource'}
      })
      .state('project.form.formIndex', {
        url: '/form',
        parent: 'project',
        template: '<form-list project="currentProject" form-type="\'form\'" num-per-page="25"></form-list>'
      })
      .state('project.form.resourceIndex', {
        url: '/form',
        parent: 'project',
        template: '<form-list project="currentProject" form-type="\'resource\'" num-per-page="25"></form-list>'
      })
      .state('project.form.permission', {
        url: '/permission',
        parent: 'project.form',
        templateUrl: 'views/form/permission/index.html'
      })
      .state('project.form.api', {
        url: '/api',
        parent: 'project.form',
        templateUrl: 'views/form/api/index.html',
        controller: 'ApiController'
      });

    var formStates = {};
    formStates['project.form.submission'] = {
      path: '/submission',
      id: 'subId',
      indexController: 'FormSubmissionsController',
      itemController: 'FormSubmissionController',
      editController: 'FormSubmissionEditController',
      deleteController: 'FormSubmissionDeleteController'
    };
    formStates['project.form.action'] = {
      path: '/action',
      id: 'actionId',
      enabled: {
        view: false
      },
      indexController: 'FormActionIndexController',
      editController: 'FormActionEditController',
      deleteController: 'FormActionDeleteController'
    };

    angular.forEach(formStates, function(info, state) {
      $stateProvider
        .state(state, {
          abstract: true,
          url: info.path,
          parent: 'project.form',
          template: '<div ui-view></div>'
        })
        .state(state + '.index', {
          url: '',
          parent: state,
          templateUrl: 'views/form' + info.path + '/index.html',
          controller: info.indexController
        })
        .state(state + '.item', {
          abstract: true,
          url: '/:' + info.id,
          parent: state,
          controller: info.itemController,
          templateUrl: 'views/form' + info.path + '/item.html'
        })
        .state(state + '.item.view', {
          url: '',
          parent: state + '.item',
          templateUrl: 'views/form' + info.path + '/view.html',
          controller: info.viewController
        })
        .state(state + '.item.edit', {
          url: '/edit',
          parent: state + '.item',
          templateUrl: 'views/form' + info.path + '/edit.html',
          controller: info.editController
        })
        .state(state + '.item.delete', {
          url: '/delete',
          parent: state + '.item',
          templateUrl: 'views/form' + info.path + '/delete.html',
          controller: info.deleteController
        });
    });

    // Add the action adding state.
    $stateProvider.state('project.form.action.add', {
      url: '/add/:actionName',
      parent: 'project.form.action',
      templateUrl: 'views/form/action/add.html',
      controller: 'FormActionAddController',
      params: {actionInfo: null}
    });
  }
]);

// The form list directive.
app.directive('formList', function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'views/form/form-list.html',
    scope: {
      forms: '=',
      project: '=',
      formType: '=',
      numPerPage: '='
    },
    compile: function(element, attrs) {
      if (!attrs.numPerPage) { attrs.numPerPage = 25; }
    },
    controller: [
      '$scope',
      '$rootScope',
      'AppConfig',
      function(
        $scope,
        $rootScope,
        AppConfig
      ) {
        $rootScope.activeSideBar = 'projects';
        $rootScope.noBreadcrumb = false;
        $rootScope.currentForm = false;
        $scope.formsPerPage = $scope.numPerPage;
        $scope.formsUrl = AppConfig.apiBase + '/project/' + $scope.project._id + '/form?type=' + $scope.formType;
      }
    ]
  };
});

app.controller('FormController', [
  '$scope',
  '$state',
  '$stateParams',
  '$rootScope',
  'Formio',
  'FormioAlerts',
  'AppConfig',
  'SubmissionAccessLabels',
  '$q',
  function(
    $scope,
    $state,
    $stateParams,
    $rootScope,
    Formio,
    FormioAlerts,
    AppConfig,
    SubmissionAccessLabels,
    $q
  ) {

    // Project information.
    $scope.projectId = $stateParams.projectId;

    // Resource information.
    $scope.formId = $stateParams.formId;
    $scope.formUrl = '/project/' + $scope.projectId + '/form';
    $scope.formUrl += $stateParams.formId ? ('/' + $stateParams.formId) : '';
    var formType = $stateParams.formType || 'form';
    $scope.capitalize = _.capitalize;
    $scope.form = {title: '', type: formType, components: [], access: [], submissionAccess: []};

    // Match name of form to title if not customized.
    $scope.titleChange = function(oldTitle) {
      if (!$scope.form.name || $scope.form.name === _.camelCase(oldTitle)) {
        $scope.form.name = _.camelCase($scope.form.title);
      }
    };

    // Load the form and submissions.
    $scope.formio = new Formio($scope.formUrl);

    // Load the form.
    if($scope.formId) {
      $scope.loadFormPromise = $scope.formio.loadForm().then(function(form) {
        $scope.form = form;
        $rootScope.currentForm = $scope.form;
      }, FormioAlerts.onError.bind(FormioAlerts));
      $scope.formio.loadActions().then(function(actions) {
        $scope.actions = actions;
        $scope.hasAuthAction = actions.some(function(action) {
          return action.name === 'auth';
        });
      }, FormioAlerts.onError.bind(FormioAlerts));
    }
    else {
      $scope.loadFormPromise = $q.when();
    }
    $scope.submissionAccessLabels = SubmissionAccessLabels;
    // Get the swagger URL.
    $scope.getSwaggerURL = function(format) {
      format = format || 'html';
      return AppConfig.apiBase + '/project/' + $scope.projectId + '/form/' + $scope.formId + '/spec.'+format+'?token=' + Formio.getToken();
    };

    // When a submission is made.
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      if (submission._id) {
        $state.go('project.form.submission.item.view', {subId: submission._id});
      }
    });

    // Save a form.
    $scope.saveForm = function() {
      $scope.formio.saveForm($scope.form).then(function(form) {
        var method = $stateParams.formId ? 'updated' : 'created';
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Successfully ' + method + ' form!'
        });
        $state.go('project.form.view', {formId: form._id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };

    // Delete a form.
    $scope.deleteForm = function() {
      $scope.formio.deleteForm().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Delete successful'
        });
        $state.go('project.form.index');
      }, FormioAlerts.onError.bind(FormioAlerts));
    };

    // Called when the form is updated.
    $scope.$on('formUpdate', function(event, form) {
      event.stopPropagation();
      $scope.form.components = form.components;
    });

    $rootScope.currentForm = $scope.form;
  }
]);

app.controller('FormEditController', [
  '$scope',
  function(
    $scope
  ) {
    $scope.originalForm = _.cloneDeep($scope.form);
    // Revert to original form and go back
    $scope.cancel = function() {
      _.assign($scope.form, $scope.originalForm);
      $scope.back();
    };
  }
]);

app.factory('FormioAlerts', [
  '$rootScope',
  function (
    $rootScope
  ) {
    var alerts = [];
    return {
      addAlert: function (alert) {
        alerts.push(alert);
        if(alert.element) {
          angular.element('#form-group-' + alert.element).addClass('has-error');
        }
      },
      getAlerts: function () {
        var tempAlerts = angular.copy(alerts);
        alerts.length = 0;
        alerts = [];
        return tempAlerts;
      },
      warn: function (warning) {
        if(!warning) {
          return;
        }
        this.addAlert({
          type: 'warning',
          message: warning.message || warning
        });

        // Clear old alerts with new alerts.
        $rootScope.alerts = this.getAlerts();
      },
      onError: function (error) {
        var errors = error.hasOwnProperty('errors') ? error.errors : error.data && error.data.errors;
        if(errors && (Object.keys(errors).length || errors.length) > 0) {
          _.each(errors, (function(e) {
            if(e.message || _.isString(e)) {
              this.addAlert({
                type: 'danger',
                message: e.message || e,
                element: e.path
              });
            }
          }).bind(this));
        }
        else if (error.message) {
          this.addAlert({
            type: 'danger',
            message: error.message,
            element: error.path
          });
        }

        // Remove error class from old alerts before clearing them.
        _.each($rootScope.alerts, function(alert){
          if(alert.element && !_.find(alerts, 'element', alert.element)) {
            angular.element('#form-group-' + alert.element).removeClass('has-error');
          }
        });
        // Clear old alerts with new alerts.
        $rootScope.alerts = this.getAlerts();
      }
    };
  }
]);

app.controller('FormDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: _.capitalize($scope.form.type) + ' was deleted.'
      });
      $state.go('project.edit');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go('project.form.view');
    });

    $scope.$on('formError', function(event, error) {
      event.stopPropagation();
      FormioAlerts.onError(error);
    });
  }
]);

app.controller('FormActionIndexController', [
  '$scope',
  '$state',
  'Formio',
  'FormioAlerts',
  function(
    $scope,
    $state,
    Formio,
    FormioAlerts
  ) {
    $scope.newAction = {name: '', title: 'Select an Action'};
    $scope.availableActions = {};
    $scope.addAction = function() {
      if ($scope.newAction.name) {
        $state.go('project.form.action.add', {
          actionName: $scope.newAction.name
        });
      }
      else {
        FormioAlerts.onError({
          message: 'You must select an action to add.',
          element: 'action-select'
        });
      }
    };
    $scope.formio.loadActions().then(function(actions) {
      $scope.actions = actions;
    }, FormioAlerts.onError.bind(FormioAlerts));
    $scope.formio.availableActions().then(function(available) {
      if (!available[0].name) {
        available.shift();
      }
      available.unshift($scope.newAction);
      $scope.availableActions = available;
    });
  }
]);

app.factory('ActionInfoLoader', [
  '$q',
  'Formio',
  function(
    $q,
    Formio
  ) {
    return {
      /**
       * Load the action and action information.
       *
       * @param $scope
       * @param $stateParams
       */
      load: function($scope, $stateParams) {
        // Get the action information.
        $scope.actionUrl = '';
        $scope.actionInfo = $stateParams.actionInfo || {settingsForm: {}};
        $scope.action = {data: {settings: {}}};

        // Get the action information.
        var getActionInfo = function(name) {
          return $scope.formio.actionInfo(name).then(function(actionInfo) {
            if(actionInfo) {
              $scope.actionInfo = _.merge($scope.actionInfo, actionInfo);
              return $scope.actionInfo;
            }
          });
        };

        /**
         * Load an action into the scope.
         * @param defaults
         */
        var loadAction = function(defaults) {
          if ($stateParams.actionId) {
            $scope.actionUrl = $scope.formio.formUrl + '/action/' + $stateParams.actionId;
            var loader = new Formio($scope.actionUrl);
            return loader.loadAction().then(function(action) {
              $scope.action = _.merge($scope.action, {data: action});
              return getActionInfo(action.name);
            });
          }
          else if (defaults) {
            $scope.action = _.merge($scope.action, {data: defaults});
            $scope.action.data.settings = {};
            return $q.when($scope.actionInfo);
          }
        };

        // Get the action information.
        if (!$stateParams.actionInfo && $stateParams.actionName) {
          return getActionInfo($stateParams.actionName).then(function(info) {
            return loadAction(info.defaults);
          });
        }
        else {
          // Load the action.
          return loadAction($scope.actionInfo.defaults);
        }
      }
    };
  }
]);

app.controller('FormActionAddController', [
  '$scope',
  '$stateParams',
  '$state',
  '$cacheFactory',
  'FormioAlerts',
  'FormioUtils',
  'ActionInfoLoader',
  function(
    $scope,
    $stateParams,
    $state,
    $cacheFactory,
    FormioAlerts,
    FormioUtils,
    ActionInfoLoader
  ) {
    // Invalidate cache so actions fetch fresh request for
    // component selection inputs.
    $cacheFactory.get('$http').removeAll();

    ActionInfoLoader.load($scope, $stateParams).then(function(actionInfo) {
      // Helpful warnings for certain actions

      // SQL Action missing sql server warning
      if(actionInfo && actionInfo.name === 'sql') {
        FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
          if(component.key === 'settings[type]' && JSON.parse(component.data.json).length === 0) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any SQL servers configured. You can add a SQL server in your <a href="#/project/'+$scope.projectId+'/settings/databases">Project Settings</a>.');
          }
        });
      }

      // Email action missing transports (other than the default one).
      if(actionInfo && actionInfo.name === 'email') {
        FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
          if(component.key === 'settings[transport]' && JSON.parse(component.data.json).length <= 1) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any email transports configured. You can add an email transport in your <a href="#/project/'+$scope.projectId+'/settings/email">Project Settings</a>, or you can use the default transport (charges may apply).');
          }
        });
      }

      // Auth action alert for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'auth') {
        $scope.$watch('action.data.settings', function(current, old) {
          if(current.hasOwnProperty('association')) {
            angular.element('#form-group-role').css('display', current.association === 'new' ? '' : 'none');
          }

          // Make the role required for submission if this is a new association.
          if (
            current.hasOwnProperty('association') &&
            old.hasOwnProperty('association') &&
            current.association !== old.association
          ) {
            // Find the role settings component, and require it as needed.
            FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
              if (component.key && component.key === 'role') {
                // Update the validation settings.
                component.validate = component.validate || {};
                component.validate.required = (current.association === 'new' ? true : false);
              }
            });

            // Dont save the old role settings if this is an existing association.
            current.role = (current.role && (current.association === 'new')) || '';
          }
        }, true);
      }

      // Role action alert for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'role') {
        FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The Role Assignment Action requires a Resource Form component with the API key, \'submission\', to modify existing Resource submissions.');
      }
    });

    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was created.'});
      $state.go('project.form.action.index');
    });
  }
]);

app.controller('FormActionEditController', [
  '$scope',
  '$stateParams',
  '$state',
  '$cacheFactory',
  'Formio',
  'FormioAlerts',
  'ActionInfoLoader',
  'FormioUtils',
  '$timeout',
  function(
    $scope,
    $stateParams,
    $state,
    $cacheFactory,
    Formio,
    FormioAlerts,
    ActionInfoLoader,
    FormioUtils,
    $timeout
  ) {
    // Invalidate cache so actions fetch fresh request for
    // component selection inputs.
    $cacheFactory.get('$http').removeAll();

    ActionInfoLoader.load($scope, $stateParams, Formio).then(function(actionInfo) {
      // Auth action validation changes for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'auth') {
        var toggleVisible = function(association) {
          if(!association) {
            return;
          }

          angular.element('#form-group-role').css('display', (association === 'new' ? '' : 'none'));
        };

        // Find the role settings component, and require it as needed.
        var toggleRequired = function(association, formComponents) {
          if(!formComponents || !association) {
            return;
          }

          FormioUtils.eachComponent(formComponents, function(component) {
            if (component.key && component.key === 'role') {
              // Update the validation settings.
              component.validate = component.validate || {};
              component.validate.required = (association === 'new' ? true : false);
            }
          });
        };

        // Force the validation to be run on page load.
        $timeout(function() {
          var action = $scope.action.data.settings || {};
          toggleVisible(action.association);
          toggleRequired(action.association, actionInfo.settingsForm.components);
        });

        // Watch for changes to the action settings.
        $scope.$watch('action.data.settings', function(current, old) {
          // Make the role setting required if this is for new resource associations.
          if(current.hasOwnProperty('association') &&
            old.hasOwnProperty('association') &&
            current.association !== old.association
          ) {
            toggleVisible(current.association);
            toggleRequired(current.association, actionInfo.settingsForm.components);

            // Dont save the old role settings if this is an existing association.
            current.role = (current.role && (current.association === 'new')) || '';
          }
        }, true);
      }
    });

    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was updated.'});
      $state.go('project.form.action.index');
    });
  }
]);

app.controller('FormActionDeleteController', [
  '$scope',
  '$stateParams',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $stateParams,
    $state,
    FormioAlerts
  ) {
    $scope.actionUrl = $scope.formio.formUrl + '/action/' + $stateParams.actionId;
    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was deleted.'});
      $state.go('project.form.action.index');
    });
    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go('project.form.action.index');
    });

  }
]);

app.controller('FormSubmissionsController', [
  '$scope',
  '$state',
  '$http',
  '$timeout',
  '$window',
  '$q',
  'Formio',
  'FormioUtils',
  'FormioAlerts',
  'formioComponents',
  'ngDialog',
  function(
    $scope,
    $state,
    $http,
    $timeout,
    $window,
    $q,
    Formio,
    FormioUtils,
    FormioAlerts,
    formioComponents,
    ngDialog
  ) {
    // Returns true if component should appear in table
    $scope.tableView = function(component) {
      return !component.hasOwnProperty('tableView') || component.tableView;
    };

    // Creates resourcejs sort query from kendo datasource read options
    var getSortQuery = function(options) {
      return _.map(options, function(opt) {
        return (opt.dir === 'desc' ? '-' : '') + opt.field;
      }).join(' ');
    };

    // Define grid options
    $scope.gridOptions = {
      allowCopy: {
        delimiter: ','
      },
      filterable: {
        operators: {
          string: {
            eq: 'Is equal to',
            neq: 'Is not equal to',
            startswith: 'Starts with',
            contains: 'Contains',
            doesnotcontain: 'Does not contain',
            endswith: 'Ends with',
            matchesregex: 'Matches (RegExp)',
            gt: 'Greater than',
            gte: 'Greater than or equal to',
            lt: 'Less than',
            lte: 'Less than or equal to'
          }
        },
        mode: 'menu',
        extra: false
      },
      pageable: {
        numeric: false,
        input: true,
        refresh: true,
        pageSizes: [5, 10, 25, 50, 100, 'all']
      },
      sortable: {
        mode: 'multiple'
      },
      resizable: true,
      reorderable: true,
      selectable: 'multiple, row',
      columnMenu: true,
      // This defaults to 'data' and screws everything up,
      // so we set it to something that isn't a property on submissions
      templateSettings: { paramName: 'notdata' },
      toolbar:
        '<div>' +
          '<button class="btn btn-default btn-xs" ng-click="view()" ng-disabled="selected().length != 1" ng-class="{\'btn-primary\':selected().length == 1}">' +
            '<span class="glyphicon glyphicon-eye-open"></span> View' +
          '</button>&nbsp;' +
          '<button class="btn btn-default btn-xs" ng-click="edit()" ng-disabled="selected().length != 1" ng-class="{\'btn-primary\':selected().length == 1}">' +
            '<span class="glyphicon glyphicon-edit"></span> Edit' +
          '</button>&nbsp;' +
          '<button class="btn btn-default btn-xs" ng-click="delete()" ng-disabled="selected().length < 1" ng-class="{\'btn-danger\':selected().length >= 1}">' +
            '<span class="glyphicon glyphicon-remove-circle"></span> Delete' +
          '</button>' +
        '</div>',
      change: $scope.$apply.bind($scope),
      dataSource: new kendo.data.DataSource({
        page: 1,
        pageSize: 10,
        serverPaging: true,
        serverSorting: true,
        serverFiltering: true,
        sort: {
          dir: 'desc',
          field: 'created'
        },
        schema: {
          model: {
            id: '_id'
          },
          total: function(result) {
            var match = result.headers('content-range').match(/\d+-\d+\/(\d+)/);
            return (match && match[1]) || 0;
          },
          data: 'data'
        },
        transport: {
          read: function(options) {
            var filters = options.data.filter && options.data.filter.filters;
            var params = {
              limit: options.data.take,
              skip: options.data.skip,
              sort: getSortQuery(options.data.sort)
            };
            _.each(filters, function(filter) {
              switch(filter.operator) {
                case 'eq': params[filter.field] = filter.value;
                  break;
                case 'neq': params[filter.field + '__ne'] = filter.value;
                  break;
                case 'startswith': params[filter.field + '__regex'] = '/^' + filter.value + '/i';
                  break;
                case 'endswith': params[filter.field + '__regex'] = '/' + filter.value + '$/i';
                  break;
                case 'contains': params[filter.field + '__regex'] = '/' + _.escapeRegExp(filter.value) + '/i';
                  break;
                case 'doesnotcontain': params[filter.field + '__regex'] = '/^((?!' + _.escapeRegExp(filter.value) + ').)*$/i';
                  break;
                case 'matchesregex': params[filter.field + '__regex'] = filter.value;
                  break;
                case 'gt': params[filter.field + '__gt'] = filter.value;
                  break;
                case 'gte': params[filter.field + '__gte'] = filter.value;
                  break;
                case 'lt': params[filter.field + '__lt'] = filter.value;
                  break;
                case 'lte': params[filter.field + '__lte'] = filter.value;
                  break;


              }
            });
            $http.get($scope.formio.submissionsUrl, {
              params: params
            })
            .then(options.success)
            .catch(function(err) {
              FormioAlerts.onError(err);
              options.error(err);
            });
          },
          destroy: function(options) {
            $scope.recentlyDeletedPromises.push($http.delete($scope.formio.submissionUrl + '/' + options.data._id)
            .then(options.success)
            .catch(function(err) {
              FormioAlerts.onError(err);
              options.error(err);
            }));
          }
        }
      }),
    };

    // Kendo Grids aren't horizontally scrollable unless you give
    // them a fixed width. 100% stretches the page.
    // This manually resizes the grid so that we can have scrollbars
    $scope.$on('kendoWidgetCreated', function(event, widget) {
      var resizeGrid = function() {
        widget.element.width(0);
        widget.element.width(widget.element.parent().width());
      };
      resizeGrid();
      angular.element($window).bind('resize', resizeGrid);
      $scope.$on('$destroy', function() {
        angular.element($window).unbind('resize', resizeGrid);
      });
    });



    $scope.selected = function() {
      return $scope.grid && _.map($scope.grid.select(), $scope.grid.dataItem.bind($scope.grid));
    };

    $scope.view = function() {
      $state.go('project.form.submission.item.view', {
        subId: $scope.selected()[0]._id
      });
    };

    $scope.edit = function() {
      $state.go('project.form.submission.item.edit', {
        subId: $scope.selected()[0]._id
      });
    };


    // Kendo ain't give us promises!!
    $scope.recentlyDeletedPromises = [];

    $scope.delete = function() {
      ngDialog.open({
        template: 'views/form/submission/delete-confirmation.html',
        showClose: false,
        scope: $scope
      }).closePromise.then(function(e) {
        var cancelled = e.value === false || e.value === '$closeButton' || e.value === '$document';
        if(!cancelled) {
          var dataSource = $scope.gridOptions.dataSource;
          $scope.recentlyDeletedPromises = [];
          _.each($scope.selected(), dataSource.remove.bind(dataSource));
          dataSource.sync();
          $q.all($scope.recentlyDeletedPromises).finally(dataSource.read.bind(dataSource));
        }
      });
    };

    // When form is loaded, create the columns
    $scope.loadFormPromise.then(function() {
      $timeout(function() { // Won't load on state change without this for some reason
        $scope.gridOptions.columns = _(FormioUtils.flattenComponents($scope.form.components))
        .filter($scope.tableView)
        .map(function(component){
          return {
            field: 'data.' + component.key,
            title: component.label || component.key,
            template: function(dataItem) {
              var value = Formio.fieldData(dataItem.data, component);
              var componentInfo = formioComponents.components[component.type];
              if (!componentInfo.tableView) { return (value === undefined) ? '' : value; }
              if (component.multiple && (value.length > 0)) {
                var values = [];
                angular.forEach(value, function(arrayValue) {
                  arrayValue = componentInfo.tableView(arrayValue, component);
                  if(arrayValue === undefined) {
                    return values.push('');
                  }
                  values.push(componentInfo.tableView(arrayValue, component));
                });
                return values;
              }
              value = componentInfo.tableView(value, component);
              if(value === undefined) {
                return '';
              }
              return value;
            },
            // Disabling sorting on embedded fields because it doesn't work in resourcejs yet
            sortable: component.key.indexOf('.') === -1,
            width: '200px'
          };
        })
        .value()
        .concat([
          {
            field: 'created',
            title: 'Submitted',
            width: '200px',
            template: function(dataItem) {
              return moment(dataItem.created).format('lll');
            }
          },
          {
            field: 'modified',
            title: 'Updated',
            width: '200px',
            template: function(dataItem) {
              return moment(dataItem.modified).format('lll');
            }
          }
        ]);
      });
    });
  }
]);

app.controller('FormSubmissionController', [
  '$scope',
  '$state',
  '$stateParams',
  'Formio',
  function(
    $scope,
    $state,
    $stateParams,
    Formio
  ) {
    // Submission information.
    $scope.submissionId = $stateParams.subId;
    $scope.submissionUrl = $scope.formUrl;
    $scope.submissionUrl += $stateParams.subId ? ('/submission/' + $stateParams.subId) : '';
    $scope.submissionData = Formio.submissionData;
    $scope.submission = {};

    // Load the form and submissions.
    $scope.formio = new Formio($scope.submissionUrl);

    // Load the submission.
    $scope.formio.loadSubmission().then(function(submission) {
      $scope.submission = submission;
    });
  }
]);

app.controller('FormSubmissionEditController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      var message = (submission.method === 'put') ? 'updated' : 'created';
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was ' + message + '.'
      });
      $state.go('project.form.submission.index', {formId: $scope.formId});
    });

    $scope.deleteSubmission = function() {
      $scope.formio.deleteSubmission().then(function() {
        $state.go('project.form.submission.index', {formId: $scope.formId});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('FormSubmissionDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      $state.go('project.form.submission.index');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go('project.form.submission.item.view');
    });

    $scope.$on('formError', function(event, error) {
      event.stopPropagation();
      FormioAlerts.onError(error);
    });
  }
]);

app.constant('SubmissionAccessLabels', {
  'read_all': {
    label: 'Read All Submissions',
    tooltip: 'The Read All Submissions permission will allow a user, with one of the given Roles, to read a Submission, regardless of who owns the Submission.'
  },
  'update_all': {
    label: 'Update All Submissions',
    tooltip: 'The Update All Submissions permission will allow a user, with one of the given Roles, to update a Submission, regardless of who owns the Submission. Additionally with this permission, a user can change the owner of a Submission.'
  },
  'delete_all': {
    label: 'Delete All Submissions',
    tooltip: 'The Delete All Submissions permission will allow a user, with one of the given Roles, to delete a Submission, regardless of who owns the Submission.'
  },
  'create_own': {
    label: 'Create Own Submissions',
    tooltip: 'The Create Own Submissions permission will allow a user, with one of the given Roles, to create a Submission. Upon creating the Submission, the user will be defined as its owner.'
  },
  'read_own': {
    label: 'Read Own Submissions',
    tooltip: 'The Read Own Submissions permission will allow a user, with one of the given Roles, to read a Submission. A user can only read a Submission if they are defined as its owner.'
  },
  'update_own': {
    label: 'Update Own Submissions',
    tooltip: 'The Update Own Submissions permission will allow a user, with one of the given Roles, to update a Submission. A user can only update a Submission if they are defined as its owner.'
  },
  'delete_own': {
    label: 'Delete Own Submissions',
    tooltip: 'The Delete Own Submissions permission will allow a user, with one of the given Roles, to delete a Submission. A user can only delete a Submission if they are defined as its owner.'
  }
});


app.controller('ApiController', [
  '$scope',
  '$state',
  'Formio',
  function(
    $scope,
    $state,
    Formio
  ) {
    $scope.token = Formio.getToken();
  }
]);
