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
        templateUrl: 'views/form/permission/index.html',
        controller: 'FormSubmissionsController'
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
      $stateProvider.state(state, {
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

    // Add permission state.
    $stateProvider.state('project.form.permissionIndex', {
      url: '/permission',
      parent: 'project.form',
      templateUrl: 'views/form/permission/index.html',
      controller: 'FormController'
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
    // Perform Camel Case.
    var camelCase = function(input) {
      return input.toLowerCase().replace(/ (.)/g, function(match, group1) {
        return group1.toUpperCase();
      });
    };

    // Project information.
    $scope.projectId = $stateParams.projectId;

    // Resource information.
    $scope.formId = $stateParams.formId;
    $scope.formUrl = '/project/' + $scope.projectId + '/form';
    $scope.formUrl += $stateParams.formId ? ('/' + $stateParams.formId) : '';
    var formType = $stateParams.formType || 'form';
    $scope.capitalize = _.capitalize;
    $scope.form = {title: '', type: formType, components: [], access: [], submissionAccess: []};

    // Attach the name to the title of the form.
    $scope.$watch('form.title', function() {
      $scope.form.name = $scope.form.title ? camelCase($scope.form.title) : '';
    });

    // Load the form and submissions.
    $scope.formio = new Formio($scope.formUrl);

    // Load the form.
    if($scope.formId) {
      $scope.loadFormPromise = $scope.formio.loadForm().then(function(form) {
        $scope.form = form;
        $rootScope.currentForm = $scope.form;
      });
    }
    else {
      $scope.loadFormPromise = $q.when();
    }
    $scope.submissionAccessLabels = SubmissionAccessLabels;
    // Get the swagger URL.
    $scope.getSwaggerURL = function() {
      return AppConfig.apiBase + '/project/' + $scope.projectId + '/form/' + $scope.formId + '/spec.html?token=' + Formio.getToken();
    };

    // When a submission is made.
    $scope.disableSubmissionHandler = $scope.$on('formSubmission', function(event, submission) {
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

    $rootScope.currentForm = $scope.form;
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
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Form was deleted.'
      });
      $state.go('project.view');
    });

    $scope.$on('cancel', function() {
      $state.go('project.form.view');
    });

    $scope.$on('formError', function(event, error) {
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
    $scope.actions = {};
    $scope.addAction = function() {
      if ($scope.newAction.name) {
        $state.go('project.form.action.add', {
          actionName: $scope.newAction.name,
          actionInfo: $scope.newAction
        });
      }
      else {
        FormioAlerts.addAlert({
          type: 'danger',
          message: 'You must add an action to continue.',
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

/**
 * Load the action and action information.
 *
 * @param $scope
 * @param $stateParams
 */
var loadActionInfo = function($scope, $stateParams, Formio) {

  // Get the action information.
  $scope.actionUrl = '';
  $scope.actionInfo = $stateParams.actionInfo || {settingsForm: {}};
  $scope.action = {data: {settings: {}}};
  $scope.disableSubmissionHandler();

  // Get the action information.
  var getActionInfo = function(name, done) {
    $scope.formio.availableActions().then(function(actions) {
      angular.forEach(actions, function(action) {
        if (action.name === name) {
          $scope.actionInfo = _.merge($scope.actionInfo, action);
          if (done) { done($scope.actionInfo); }
        }
      });
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
      loader.loadAction().then(function(action) {
        $scope.action = _.merge($scope.action, {data: action});
        getActionInfo(action.name);
      });
    }
    else if (defaults) {
      $scope.action = _.merge($scope.action, {data: defaults});
      $scope.action.data.settings = {};
    }
  };

  // Get the action information.
  if (!$stateParams.actionInfo && $stateParams.actionName) {
    getActionInfo($stateParams.actionName, function(info) {
      loadAction(info.defaults);
    });
  }
  else {

    // Load the action.
    loadAction($scope.actionInfo.defaults);
  }
};

app.controller('FormActionAddController', [
  '$scope',
  '$stateParams',
  '$state',
  '$cacheFactory',
  'FormioAlerts',
  function(
    $scope,
    $stateParams,
    $state,
    $cacheFactory,
    FormioAlerts
  ) {
    // Invalidate cache so actions fetch fresh request for
    // component selection inputs.
    $cacheFactory.get('$http').removeAll();

    loadActionInfo($scope, $stateParams);
    $scope.$on('formSubmission', function() {
      FormioAlerts.addAlert({type: 'success', message: 'Action was created.'});
      $state.go('project.form.action.index');
    });
  }
]);

app.controller('FormActionEditController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioAlerts',
  function(
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioAlerts
  ) {
    loadActionInfo($scope, $stateParams, Formio);
    $scope.$on('formSubmission', function() {
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
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({type: 'success', message: 'Action was deleted.'});
      $state.go('project.form.action.index');
    });
  }
]);

app.controller('FormSubmissionsController', [
  '$scope',
  '$state',
  'Formio',
  function(
    $scope,
    $state,
    Formio
  ) {
    $scope.token = Formio.getToken();

    $scope.$on('submissionView', function(event, submission) {
      $state.go('project.form.submission.item.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go('project.form.submission.item.edit', {
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go('project.form.submission.item.delete', {
        subId: submission._id
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
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      $state.go('project.form.submission.index');
    });

    $scope.$on('cancel', function() {
      $state.go('project.form.submission.item.view');
    });

    $scope.$on('formError', function(event, error) {
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
