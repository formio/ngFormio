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
      .state('app.form', {
        abstract: true,
        url: '/form/:formId',
        parent: 'app',
        templateUrl: 'views/form/form.html',
        controller: 'FormController'
      })
      .state('app.form.view', {
        url: '',
        parent: 'app.form',
        templateUrl: 'views/form/form-view.html'
      })
      .state('app.form.edit', {
        url: '/edit',
        parent: 'app.form',
        templateUrl: 'views/form/form-edit.html'
      })
      .state('app.form.delete', {
        url: '/delete',
        parent: 'app.form',
        controller: 'FormDeleteController',
        templateUrl: 'views/form/form-delete.html'
      })
      .state('app.form.createForm', {
        url: '/create/form',
        parent: 'app',
        templateUrl: 'views/form/form-edit.html',
        controller: 'FormController',
        params: {formType: 'form'}
      })
      .state('app.form.createResource', {
        url: '/create/resource',
        parent: 'app',
        templateUrl: 'views/form/form-edit.html',
        controller: 'FormController',
        params: {formType: 'resource'}
      })
      .state('app.form.formIndex', {
        url: '/form',
        parent: 'app',
        template: '<form-list app="currentApp" form-type="\'form\'" num-per-page="25"></form-list>'
      })
      .state('app.form.resourceIndex', {
        url: '/form',
        parent: 'app',
        template: '<form-list app="currentApp" form-type="\'resource\'" num-per-page="25"></form-list>'
      });

    var formStates = {};
    formStates['app.form.submission'] = {
      path: '/submission',
      id: 'subId',
      indexController: 'FormSubmissionsController',
      itemController: 'FormSubmissionController',
      editController: 'FormSubmissionEditController',
      deleteController: 'FormSubmissionDeleteController'
    };
    formStates['app.form.action'] = {
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
        parent: 'app.form',
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
    $stateProvider.state('app.form.action.add', {
      url: '/add/:actionName',
      parent: 'app.form.action',
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
      app: '=',
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
        $rootScope.activeSideBar = 'apps';
        $rootScope.noBreadcrumb = false;
        $rootScope.currentForm = false;
        $scope.formsPerPage = $scope.numPerPage;
        $scope.formsUrl = AppConfig.apiBase + '/app/' + $scope.app._id + '/form?type=' + $scope.formType;
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
  function(
    $scope,
    $state,
    $stateParams,
    $rootScope,
    Formio,
    FormioAlerts,
    AppConfig
  ) {

    // Perform Camel Case.
    var camelCase = function(input) {
      return input.toLowerCase().replace(/ (.)/g, function(match, group1) {
        return group1.toUpperCase();
      });
    };

    // Application information.
    $scope.appId = $stateParams.appId;

    // Resource information.
    $scope.formId = $stateParams.formId;
    $scope.formUrl = '/app/' + $stateParams.appId + '/form';
    $scope.formUrl += $stateParams.formId ? ('/' + $stateParams.formId) : '';
    var formType = $stateParams.formType || 'form';
    $scope.form = {title: '', type: formType, components: [], access: []};

    // Attach the name to the title of the form.
    $scope.$watch('form.title', function() {
      $scope.form.name = $scope.form.title ? camelCase($scope.form.title) : '';
    });

    // Load the form and submissions.
    $scope.formio = new Formio($scope.formUrl);

    // Load the form.
    var anonId = '000000000000000000000000';
    $scope.anonymous = false;
    var checkAnonymous = function() {
      var isAnon = false;
      if ($scope.form) {
        angular.forEach($scope.form.access, function(access, index) {
          if (access.id === anonId) {
            $scope.anonymous = true;
            isAnon = index;
          }
        });
      }
      return isAnon;
    };

    $scope.onAnonymous = function(anon) {
      if (!$scope.form) { return; }
      if (anon) {
        if (checkAnonymous() === false) {
          $scope.form.access.push({
            id: anonId,
            name: 'Anonymous'
          });
        }
      }
      else {
        var anonIndex = checkAnonymous();
        if (anonIndex !== false) {
          $scope.form.access.splice(anonIndex, 1);
        }
      }
    };
    // Default to anonymous for new forms
    if(!$scope.formId) {
      $scope.onAnonymous(true);
    }

    // Load the form.
    $scope.formio.loadForm().then(function(form) {
      $scope.form = form;
      $rootScope.currentForm = $scope.form;
      checkAnonymous();

    });

    // Get the swagger URL.
    $scope.getSwaggerURL = function() {
      return AppConfig.appBase + '/form/' + $scope.form._id + '/spec.html?token=' + Formio.getToken();
    };

    // When a submission is made.
    $scope.disableSubmissionHandler = $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      if (submission._id) {
        $state.go('app.form.submission.item.view', {subId: submission._id});
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
        $state.go('app.form.view', {formId: form._id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };

    // Delete a form.
    $scope.deleteForm = function() {
      $scope.formio.deleteForm().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Delete successful'
        });
        $state.go('app.form.index');
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
      $state.go('app.view');
    });

    $scope.$on('cancel', function() {
      $state.go('app.form.view');
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
        $state.go('app.form.action.add', {
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
  'FormioAlerts',
  function(
    $scope,
    $stateParams,
    $state,
    FormioAlerts
  ) {
    loadActionInfo($scope, $stateParams);
    $scope.$on('formSubmission', function() {
      FormioAlerts.addAlert({type: 'success', message: 'Action was created.'});
      $state.go('app.form.action.index');
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
      $state.go('app.form.action.index');
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
      $state.go('app.form.action.index');
    });
  }
]);

app.controller('FormSubmissionsController', [
  '$scope',
  '$state',
  function(
    $scope,
    $state
  ) {
    $scope.$on('submissionView', function(event, submission) {
      $state.go('app.form.submission.item.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go('app.form.submission.item.edit', {
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go('app.form.submission.item.delete', {
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
      $state.go('app.form.submission.index', {formId: $scope.formId});
    });

    $scope.deleteSubmission = function() {
      $scope.formio.deleteSubmission().then(function() {
        $state.go('app.form.submission.index', {formId: $scope.formId});
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
      $state.go('app.form.submission.index');
    });

    $scope.$on('cancel', function() {
      $state.go('app.form.submission.item.view');
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });
  }
]);

