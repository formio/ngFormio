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
    var typeInfo = {
      form: {
        type: 'form',
        title: 'Forms',
        name: 'Form',
        icon: 'fa fa-tasks',
        help: 'http://help.form.io/userguide/#forms',
        description: 'Forms serve as an input interface for Resources as well as free-form user input within your Application. Example: Login Form, Contact Form, etc.'
      },
      resource: {
        type: 'resource',
        title: 'Resources',
        name: 'Resource',
        icon: 'fa fa-database',
        help: 'http://help.form.io/userguide/#resources',
        description: 'Resources are the objects within your Application. Example: User, Company, Vehicle, etc.'
      }
    };

    // Create states for both forms and resources.
    angular.forEach(['resource', 'form'], function(type) {
      var parentName = 'project.' + type;
      $stateProvider
        .state(parentName, {
          abstract: true,
          url: '/' + type,
          templateUrl: 'views/form/base.html',
          controller: [
            '$scope',
            '$state',
            function(
              $scope,
              $state
            ) {
              $scope.formInfo = $state.current.data;
              $scope.infoTemplate = 'views/form/' + $scope.formInfo.type + '-info.html';
            }
          ],
          data: typeInfo[type]
        })
        .state(parentName + '.index', {
          url: '/',
          templateUrl: 'views/form/index.html'
        })
        .state(parentName + '.create', {
          url: '/create/' + type,
          templateUrl: 'views/form/form-edit.html',
          controller: 'FormController',
          params: {formType: type}
        })
        .state(parentName + '.form', {
          abstract: true,
          url: '/:formId',
          templateUrl: 'views/form/form.html',
          controller: 'FormController'
        })
        .state(parentName + '.form.view', {
          url: '/',
          templateUrl: 'views/form/form-view.html'
        })
        .state(parentName + '.form.edit', {
          url: '/edit',
          controller: 'FormEditController',
          templateUrl: 'views/form/form-edit.html'
        })
        .state(parentName + '.form.delete', {
          url: '/delete',
          controller: 'FormDeleteController',
          templateUrl: 'views/form/form-delete.html'
        })
        .state(parentName + '.form.permission', {
          url: '/permission',
          templateUrl: 'views/form/permission/index.html'
        })
        .state(parentName + '.form.api', {
          url: '/api',
          templateUrl: 'views/form/api/index.html',
          controller: 'ApiController'
        });

      var formStates = {};
      formStates[parentName + '.form.submission'] = {
        path: '/submission',
        id: 'subId',
        indexController: 'FormSubmissionsController',
        itemController: 'FormSubmissionController',
        editController: 'FormSubmissionEditController',
        deleteController: 'FormSubmissionDeleteController'
      };
      formStates[parentName + '.form.action'] = {
        path: '/action',
        id: 'actionId',
        indexController: 'FormActionIndexController',
        editController: 'FormActionEditController',
        deleteController: 'FormActionDeleteController'
      };

      angular.forEach(formStates, function(info, state) {
        $stateProvider
          .state(state, {
            abstract: true,
            url: info.path,
            template: '<div ui-view></div>'
          })
          .state(state + '.index', {
            url: '',
            templateUrl: 'views/form' + info.path + '/index.html',
            controller: info.indexController
          })
          .state(state + '.item', {
            abstract: true,
            url: '/:' + info.id,
            controller: info.itemController,
            templateUrl: 'views/form' + info.path + '/item.html'
          })
          .state(state + '.item.view', {
            url: '',
            templateUrl: 'views/form' + info.path + '/view.html'
          })
          .state(state + '.item.edit', {
            url: '/edit',
            templateUrl: 'views/form' + info.path + '/edit.html',
            controller: info.editController
          })
          .state(state + '.item.delete', {
            url: '/delete',
            templateUrl: 'views/form' + info.path + '/delete.html',
            controller: info.deleteController
          });
      });

      // Add the action adding state.
      $stateProvider.state(parentName + '.form.action.add', {
        url: '/add/:actionName',
        templateUrl: 'views/form/action/add.html',
        controller: 'FormActionEditController',
        params: {actionInfo: null}
      });
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
      numPerPage: '=',
      listMode: '='
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
        $scope.export = function(form, type) {
          window.open(AppConfig.apiBase + '/project/' + $scope.project._id + '/form/' + form._id + '/export?format=' + type + '&x-jwt-token=' + $rootScope.userToken);
        };
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
  'GoogleAnalytics',
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
    GoogleAnalytics,
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
        // Get the available actions for the form, to check if premium actions are present.
        $scope.formio.availableActions().then(function(available) {
          var premium = _.pluck(_.filter(available, function(action) {
            return (action.hasOwnProperty('premium') && action.premium === true);
          }), 'name');

          $scope.hasPremAction = _.some(actions, function(action) {
            return (action.hasOwnProperty('name') && action.name && premium.indexOf(action.name) !== -1);
          });
        });

        $scope.actions = actions;
        $scope.hasAuthAction = actions.some(function(action) {
          return action.name === 'auth' || action.name === 'oauth';
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
      GoogleAnalytics.sendEvent('Submission', 'create', null, 1);
      if (submission._id) {
        $state.go('project.' + $scope.formInfo.type + '.form.submission.item.view', {subId: submission._id});
      }
    });

    // Save a form.
    $scope.saveForm = function() {
      angular.element('.has-error').removeClass('has-error');
      $scope.formio.saveForm(angular.copy($scope.form)) // Copy to remove angular $$hashKey
      .then(function(form) {
        var method = $stateParams.formId ? 'updated' : 'created';
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Successfully ' + method + ' form!'
        });
        var action = $stateParams.formId ? 'update' : 'create';
        GoogleAnalytics.sendEvent('Form', action, null, 1);

        $state.go('project.' + $scope.formInfo.type + '.form.view', {formId: form._id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };

    // Delete a form.
    $scope.deleteForm = function() {
      $scope.formio.deleteForm().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Delete successful'
        });
        $state.go('project.' + $scope.formInfo.type + '.form.index');
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
  '$q',
  function(
    $scope,
    $q
  ) {
    // Clone original form after it has loaded, or immediately
    // if we're not loading a form
    ($scope.loadFormPromise || $q.when()).then(function() {
      $scope.originalForm = _.cloneDeep($scope.form);
    });

    // Revert to original form and go back
    $scope.cancel = function() {
      _.assign($scope.form, $scope.originalForm);
      $scope.back('project.' + $scope.formInfo.type + '.form.view');
    };
  }
]);

app.factory('FormioAlerts', [
  '$rootScope',
  'Notification',
  function (
    $rootScope,
    Notification
  ) {
    return {
      addAlert: function (alert) {
        switch (alert.type) {
          case 'danger':
            Notification.error({message: alert.message});
            break;
          case 'info':
            Notification.info({message: alert.message});
            break;
          case 'success':
            Notification.success({message: alert.message});
            break;
          case 'warning':
            Notification.warning({message: alert.message});
            break;
        }

        if (alert.element) {
          angular.element('#form-group-' + alert.element).addClass('has-error');
        }
      },
      warn: function (warning) {
        if(!warning) {
          return;
        }
        this.addAlert({
          type: 'warning',
          message: warning.message || warning
        });
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
      }
    };
  }
]);

app.controller('FormDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  'GoogleAnalytics',
  function(
    $scope,
    $state,
    FormioAlerts,
    GoogleAnalytics
  ) {
    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: _.capitalize($scope.form.type) + ' was deleted.'
      });
      GoogleAnalytics.sendEvent('Form', 'delete', null, 1);
      $state.go('project.edit');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $scope.back('project.' + $scope.formInfo.type + '.form.view');
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
        $state.go('project.' + $scope.formInfo.type + '.form.action.add', {
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

app.controller('FormActionEditController', [
  '$scope',
  '$stateParams',
  '$state',
  '$cacheFactory',
  'FormioAlerts',
  'ActionInfoLoader',
  'FormioUtils',
  'GoogleAnalytics',
  '$timeout',
  function(
    $scope,
    $stateParams,
    $state,
    $cacheFactory,
    FormioAlerts,
    ActionInfoLoader,
    FormioUtils,
    GoogleAnalytics,
    $timeout
  ) {
    // Invalidate cache so actions fetch fresh request for
    // component selection inputs.
    $cacheFactory.get('$http').removeAll();

    // Helpful warnings for certain actions
    ActionInfoLoader.load($scope, $stateParams).then(function(actionInfo) {
      // SQL Action missing sql server warning
      if(actionInfo && actionInfo.name === 'sql') {
        var typeComponent = FormioUtils.getComponent(actionInfo.settingsForm.components, 'settings[type]');
        if(JSON.parse(typeComponent.data.json).length === 0) {
          FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any SQL servers configured. You can add a SQL server in your <a href="#/project/'+$scope.projectId+'/settings/databases">Project Settings</a>.');
        }
      }

      // Email action missing transports (other than the default one).
      if(actionInfo && actionInfo.name === 'email') {
        var transportComponent = FormioUtils.getComponent(actionInfo.settingsForm.components, 'settings[transport]');
        if(JSON.parse(transportComponent.data.json).length <= 1) {
          FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any email transports configured. You can add an email transport in your <a href="#/project/'+$scope.projectId+'/settings/email">Project Settings</a>, or you can use the default transport (charges may apply).');
        }
      }

      // Role action alert for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'role') {
        FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The Role Assignment Action requires a Resource Form component with the API key, \'submission\', to modify existing Resource submissions.');
      }

      // Hubspot action missing settings due to missing API key.
      if(actionInfo && actionInfo.name === 'hubspotContact') {
        var showFields = function(key, value) {
          var fields = {
            '_value': 'none',
            '_field': 'none'
          };
          switch(value) {
            case 'field':
              fields._field = '';
              break;
            case 'value':
            case 'increment':
            case 'decrement':
              fields._value = '';
              break;
          }
          angular.element('#form-group-' + key + '_value').css('display', fields._value);
          angular.element('#form-group-' + key + '_field').css('display', fields._field);
        };

        if(!$scope.currentProject.settings || !$scope.currentProject.settings.hubspot || !$scope.currentProject.settings.hubspot.apikey) {
          FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You have not yet configured your Hubspot API key. You can configure your Hubspot API key in your <a href="#/project/'+$scope.projectId+'/settings/hubspot">Project Settings</a>.');
          $scope.formDisabled = true;
        }
        FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
          var result = component.key.match(/settings\[(.*)_action\]/);
          if (result) {
            $timeout(function() {
              showFields(result[1], $scope.action.data.settings[result[1] + '_action']);
            });
            $scope.$watch('action.data.settings.' + result[1] + '_action', function(current, old) {
              showFields(result[1], current);
            });
          }
        });
      }

      // Hide role settings component as needed
      var toggleVisible = function(association) {
        if(!association) {
          return;
        }

        angular.element('#form-group-role').css('display', (association === 'new' ? '' : 'none'));
        angular.element('#form-group-resource').css('display', (association === 'link' ? 'none' : ''));
      };

      // Find the role settings component, and require it as needed.
      var toggleRequired = function(association, formComponents) {
        if(!formComponents || !association) {
          return;
        }

        var roleComponent = FormioUtils.getComponent(formComponents, 'role');
        var resourceComponent = FormioUtils.getComponent(formComponents, 'resource');
        // Update the validation settings.
        roleComponent.validate = roleComponent.validate || {};
        roleComponent.validate.required = (association === 'new' ? true : false);
        resourceComponent.validate = resourceComponent.validate || {};
        resourceComponent.validate.required = (association === 'link' ? false : true);
      };

      // Auth action validation changes for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'auth') {
        // Force the validation to be run on page load.
        $timeout(function() {
          var action = $scope.action.data.settings || {};
          toggleVisible(action.association);
          toggleRequired(action.association, actionInfo.settingsForm.components);
        });

        // Watch for changes to the action settings.
        $scope.$watch('action.data.settings', function(current, old) {
          // Make the role setting required if this is for new resource associations.
          if(current.association !== old.association) {
            toggleVisible(current.association);
            toggleRequired(current.association, actionInfo.settingsForm.components);

            // Dont save the old role settings if this is an existing association.
            current.role = (current.role && (current.association === 'new')) || '';
          }
        }, true);
      }

      var showProviderFields = function(association, provider) {
        angular.element('[id^=form-group-autofill-]').css('display', 'none');
        if(association === 'new' && provider) {
          angular.element('[id^=form-group-autofill-' + provider + ']').css('display', '');
        }
      };

      if(actionInfo && actionInfo.name === 'oauth') {
        // Show warning if button component has no options
        var buttonComponent = FormioUtils.getComponent(actionInfo.settingsForm.components, 'settings[button]');
        if(JSON.parse(buttonComponent.data.json).length === 0) {
          FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any Button components with the `oauth` action on this form, which is required to use this action. You can add a Button component on the <a href="#/project/'+$scope.projectId+'/form/'+$scope.formId+'/edit">form edit page</a>.');
        }
        // Force the validation to be run on page load.
        $timeout(function() {
          var action = $scope.action.data.settings || {};
          toggleVisible(action.association);
          toggleRequired(action.association, actionInfo.settingsForm.components);
          showProviderFields(action.association, action.provider);
        });

        // Watch for changes to the action settings.
        $scope.$watch('action.data.settings', function(current, old) {
          // Make the role setting required if this is for new resource associations.
          if(current.association !== old.association) {
            toggleVisible(current.association);
            toggleRequired(current.association, actionInfo.settingsForm.components);
            showProviderFields(current.association, current.provider);

            // Dont save the old role settings if this is an existing association.
            current.role = (current.role && (current.association === 'new')) || '';
          }

          if(current.provider !== old.provider) {
            showProviderFields(current.association, current.provider);
          }
        }, true);
      }

      // Check for, and warn about premium actions being present.
      if(
        actionInfo &&
        actionInfo.hasOwnProperty('premium') &&
        actionInfo.premium === true &&
        $scope.currentProject &&
        $scope.currentProject.hasOwnProperty('plan') &&
        $scope.currentProject.plan === 'basic'
      ) {
        FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> This is a Premium Action, please upgrade your <a ui-sref="project.settings.plan">project plan</a> to enable it.');
      }
    });

    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      var method = $scope.actionUrl ? 'updated' : 'created';
      FormioAlerts.addAlert({type: 'success', message: 'Action was ' + method + '.'});
      $state.go('project.' + $scope.formInfo.type + '.form.action.index');
      var eventAction = $scope.actionUrl ? 'update' : 'create';
      GoogleAnalytics.sendEvent('Action', eventAction, null, 1);
    });
  }
]);

app.controller('FormActionDeleteController', [
  '$scope',
  '$stateParams',
  '$state',
  'FormioAlerts',
  'GoogleAnalytics',
  function(
    $scope,
    $stateParams,
    $state,
    FormioAlerts,
    GoogleAnalytics
  ) {
    $scope.actionUrl = $scope.formio.formUrl + '/action/' + $stateParams.actionId;
    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was deleted.'});
      GoogleAnalytics.sendEvent('Action', 'delete', null, 1);
      $state.go('project.' + $scope.formInfo.type + '.form.action.index');
    });
    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go('project.' + $scope.formInfo.type + '.form.action.index');
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
  'GoogleAnalytics',
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
    GoogleAnalytics,
    ngDialog
  ) {
    // Returns true if component should appear in table
    $scope.tableView = function(component) {
      return !component.protected &&
        (!component.hasOwnProperty('persistent') || component.persistent) &&
        (!component.hasOwnProperty('tableView') || component.tableView);
    };

    // Creates resourcejs sort query from kendo datasource read options
    var getSortQuery = function(options) {
      return _.map(options, function(opt) {
        return (opt.dir === 'desc' ? '-' : '') + opt.field;
      }).join(' ');
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
      $state.go('project.' + $scope.formInfo.type + '.form.submission.item.view', {
        subId: $scope.selected()[0]._id
      });
    };

    $scope.edit = function() {
      $state.go('project.' + $scope.formInfo.type + '.form.submission.item.edit', {
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

    var stopScroll = function(element) {
      var activeElement;

      angular.element($window.document).bind('mousewheel DOMMouseScroll', function(e) {
          var scrollTo = null;

          if (!angular.element(activeElement).closest('.k-popup').length) {
            return;
          }

          if (e.type === 'mousewheel') {
              scrollTo = (e.originalEvent.wheelDelta * -1);
          }
          else if (e.type === 'DOMMouseScroll') {
              scrollTo = 40 * e.originalEvent.detail;
          }

          if (scrollTo) {
              e.preventDefault();
              element.scrollTop(scrollTo + element.scrollTop());
          }
      });

      angular.element($window.document).on('mouseover', function(e) {
            activeElement = e.target;
      });
    };

    // When form is loaded, create the columns
    $scope.loadFormPromise.then(function() {
      $timeout(function() { // Won't load on state change without this for some reason

        // Define DataSource
        var dataSource = new kendo.data.DataSource({
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
              id: '_id',
              fields: _(FormioUtils.flattenComponents($scope.form.components))
                .filter($scope.tableView)
                .map(function(component) {
                  var type;
                  switch(component.type) {
                    case 'checkbox': type = 'boolean';
                      break;
                    case 'datetime': type = 'date';
                      break;
                    case 'number': type = 'number';
                      break;
                    default: type = 'string';
                  }
                  return [
                    'data.' + component.key.replace(/\./g, '.data.'), // Key
                    {                                                 // Value
                      type: type
                    }
                  ];
                })
                .concat([
                  ['created', {type: 'date'}],
                  ['modified', {type: 'date'}]
                ])
                .zipObject()
                .value()
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
              .then(function(result) {
                // Fill in gaps in data so Kendo doesn't crash on missing nested fields
                _(FormioUtils.flattenComponents($scope.form.components))
                .filter($scope.tableView)
                .each(function(component) {
                  _.each(result.data, function(row) {
                    var key = 'data.' + component.key.replace(/\./g, '.data.');
                    var value = _.get(row, key);
                    if(value === undefined) {
                      // This looks like it does nothing but it ensures
                      // that the path to the key is reachable by
                      // creating objects that don't exist
                      _.set(row, key, undefined);
                    }
                  });

                })
                .value();
                return result;
              })
              .then(options.success)
              .catch(function(err) {
                FormioAlerts.onError(err);
                options.error(err);
              });
            },
            destroy: function(options) {
              $scope.recentlyDeletedPromises.push($http.delete($scope.formio.submissionsUrl + '/' + options.data._id)
              .then(function(result) {
                GoogleAnalytics.sendEvent('Submission', 'delete', null, 1);
                options.success();
              })
              .catch(function(err) {
                FormioAlerts.onError(err);
                options.error(err);
              }));
            }
          }
        });

        // Generate columns
        var columns = _(FormioUtils.flattenComponents($scope.form.components))
        .filter($scope.tableView)
        .map(function(component){
          var filterable;
          switch(component.type) {
            case 'datetime': filterable = { ui: 'datetimepicker' };
              break;
            // Filtering is not supported for these data types in resourcejs yet
            case 'address':
            case 'resource':
            case 'signature':
              filterable = false;
              break;
            default: filterable = true;
          }
          return {
            field: 'data.' + component.key.replace(/\./g, '.data.'),
            title: component.label || component.key,
            template: function(dataItem) {
              var value = Formio.fieldData(dataItem.data.toJSON(), component);
              var componentInfo = formioComponents.components[component.type];
              if (!componentInfo.tableView) {
                if(value === undefined) {
                  return '';
                }
                if(component.multiple) {
                  return value.join(', ');
                }
                return value;
              }
              if (component.multiple && (value.length > 0)) {
                var values = [];
                angular.forEach(value, function(arrayValue) {
                  arrayValue = componentInfo.tableView(arrayValue, component);
                  if(arrayValue === undefined) {
                    return values.push('');
                  }
                  values.push(arrayValue);
                });
                return values.join(', ');
              }
              value = componentInfo.tableView(value, component);
              if(value === undefined) {
                return '';
              }
              return value;
            },
            // Disabling sorting on embedded fields because it doesn't work in resourcejs yet
            width: '200px',
            filterable: filterable
          };
        })
        .value()
        .concat([
          {
            field: 'created',
            title: 'Submitted',
            width: '200px',
            filterable: {
              ui: 'datetimepicker'
            },
            template: function(dataItem) {
              return moment(dataItem.created).format('lll');
            }
          },
          {
            field: 'modified',
            title: 'Updated',
            width: '200px',
            filterable: {
              ui: 'datetimepicker'
            },
            template: function(dataItem) {
              return moment(dataItem.modified).format('lll');
            }
          }
        ]);

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
              },
              date: {
                gt: 'Is after',
                lt: 'Is before'
              }
            },
            messages: {
              isTrue: 'True',
              isFalse: 'False'
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
          sortable: true,
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
          dataSource: dataSource,
          columns: columns,
          columnMenuInit: function(e) {
            e.container.find('[data-role=dropdownlist]').each(function() {
              var widget = angular.element(this).data('kendoDropDownList');
              stopScroll(widget.ul.parent());
            });
          }
        };
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
  'GoogleAnalytics',
  function(
    $scope,
    $state,
    FormioAlerts,
    GoogleAnalytics
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      var message = (submission.method === 'put') ? 'updated' : 'created';
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was ' + message + '.'
      });
      GoogleAnalytics.sendEvent('Submission', 'update', null, 1);
      $state.go('project.' + $scope.formInfo.type + '.form.submission.index', {formId: $scope.formId});
    });
  }
]);

app.controller('FormSubmissionDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  'GoogleAnalytics',
  function(
    $scope,
    $state,
    FormioAlerts,
    GoogleAnalytics
  ) {
    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      GoogleAnalytics.sendEvent('Submission', 'delete', null, 1);
      $state.go('project.' + $scope.formInfo.type + '.form.submission.index');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $scope.back('project.' + $scope.formInfo.type + '.form.submission.item.view');
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
