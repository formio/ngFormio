'use strict';

/* global _: false */

var app = angular.module('formioApp.controllers.resource', [
  'ngDialog',
  'ui.sortable',
  'ui.bootstrap.tabs',
  'ui.bootstrap.tpls',
  'ui.bootstrap.accordion',
  'ngFormBuilder',
  'formio',
  'bgf.paginateAnything'
]);

app.provider('Resource', [
  '$stateProvider',
  'RestangularProvider',
  function(
    $stateProvider,
    RestangularProvider
  ) {

    var resources = {};

    // Configure restangular.
    RestangularProvider.setRestangularFields({
      id: '_id'
    });

    return {
      register: function(resourceInfo) {
        var resourceParam = ' resource-title="\'' + resourceInfo.title + '\'"';
        resourceParam += ' resource-name="\'' + resourceInfo.name + '\'"';
        resources[resourceInfo.name] = resourceInfo;
        var appState = 'app.' + resourceInfo.name;
        $stateProvider
          .state(appState, {
            abstract: true,
            url: resourceInfo.url + '/:id',
            parent: 'app',
            templateUrl: 'views/resource/resource-root.html',
            controller: 'ResourceController',
            params: {resourceInfo: resourceInfo}
          })
          .state(appState + '.view', {
            url: '',
            parent: appState,
            templateUrl: 'views/resource/resource-view.html',
            controller: 'ResourceViewController'
          })
          .state(appState + '.edit', {
            url: '/edit',
            parent: appState,
            templateUrl: 'views/resource/resource-edit.html'
          })
          .state(appState + '.delete', {
            url: '/delete',
            parent: appState,
            templateUrl: 'views/resource/resource-delete.html',
            controller: 'ResourceDeleteController'
          })
          .state(appState + '.create', {
            url: '/create/' + resourceInfo.name,
            parent: 'app',
            templateUrl: 'views/resource/resource-create.html',
            controller: 'ResourceController',
            params: {resourceInfo: resourceInfo}
          })
          .state(appState + '.index', {
            url: resourceInfo.url,
            parent: 'app',
            template: '<resource-list' + resourceParam + '></resource-list>'
          })
          .state(appState + '.api', {
            url: '/api',
            parent: appState,
            templateUrl: 'views/resource/resource-api.html',
            controller: 'ResourceAPIController'
          })
          .state(appState + '.api.spec', {
            url: '/spec',
            parent: appState + '.api',
            templateUrl: 'views/resource/resource-api.spec.html',
            controller: 'ResourceAPISpecController'
          })
          .state(appState + '.api.embed', {
            url: '/embed',
            parent: appState + '.api',
            templateUrl: 'views/resource/resource-api.embed.html'
          });


        var resourceStates = {};
        resourceStates[appState + '.submission'] = {
          path: '/submission',
          id: 'subId',
          indexController: 'ResourceSubmissionsController',
          itemController: 'ResourceSubmissionController',
          editController: 'ResourceSubmissionEditController',
          deleteController: 'ResourceSubmissionDeleteController'
        };
        resourceStates[appState + '.action'] = {
          path: '/action',
          id: 'actionId',
          enabled: {
            view: false
          },
          indexController: 'ResourceActionIndexController',
          editController: 'ResourceActionEditController',
          deleteController: 'ResourceActionDeleteController'
        };
        angular.forEach(resourceStates, function(info, state) {
          $stateProvider.state(state, {
            abstract: true,
            url: info.path,
            parent: appState,
            template: '<div ui-view></div>'
          })
          .state(state + '.index', {
            url: '',
            parent: state,
            templateUrl: 'views/resource' + info.path + '/index.html',
            controller: info.indexController
          })
          .state(state + '.item', {
            abstract: true,
            url: '/:' + info.id,
            parent: state,
            controller: info.itemController,
            templateUrl: 'views/resource' + info.path + '/item.html'
          })
          .state(state + '.item.view', {
            url: '',
            parent: state + '.item',
            templateUrl: 'views/resource' + info.path + '/view.html',
              controller: info.viewController
          })
          .state(state + '.item.edit', {
            url: '/edit',
            parent: state + '.item',
            templateUrl: 'views/resource' + info.path + '/edit.html',
            controller: info.editController
          })
          .state(state + '.item.delete', {
            url: '/delete',
            parent: state + '.item',
            templateUrl: 'views/resource' + info.path + '/delete.html',
            controller: info.deleteController
          });
        });

        // Add the action adding state.
        $stateProvider.state(appState + '.action.add', {
          url: '/add/:actionName',
          parent: appState + '.action',
          templateUrl: 'views/resource/action/add.html',
          controller: 'ResourceActionAddController',
          params: {actionInfo: null}
        });
      },
      $get: function() {
        return resources;
      }
    };
  }
]);

app.factory('FormioAlerts', [
  '$rootScope',
  function(
    $rootScope
  ) {
    var alerts = [];
    return {
      addAlert: function(alert) {
        $rootScope.alerts.push(alert);
        if (alert.element) {
          angular.element('#form-group-' + alert.element).addClass('has-error');
        }
        else {
          alerts.push(alert);
        }
      },
      getAlerts: function() {
        var tempAlerts = angular.copy(alerts);
        alerts.length = 0;
        alerts = [];
        return tempAlerts;
      },
      onError: function(error) {
        var errors = error.hasOwnProperty('errors') ? error.errors : error.data.errors;
        _.each(errors, function (error) {
          this.addAlert({
            type: 'danger',
            message: error.message,
            element: error.path
          });
        }.bind(this));
      }
    };
  }
]);

// The resource list directive.
app.directive('resourceList', function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'views/resource/resource-list.html',
    scope: {
      app: '=',
      resourceTitle: '=',
      resourceName: '=',
      numPerPage: '='
    },
    compile: function(element, attrs) {
      if (!attrs.numPerPage) { attrs.numPerPage = 25; }
      if (!attrs.resourceTitle) { attrs.resourceTitle = 'Resource'; }
      if (!attrs.resourceName) { attrs.resourceName = 'resource'; }
    },
    controller: [
      '$scope',
      '$rootScope',
      'Restangular',
      function(
        $scope,
        $rootScope,
        Restangular
      ) {
        $rootScope.activeSideBar = 'apps';
        $rootScope.noBreadcrumb = false;
        $scope.resources = [];
        $scope.resourcesPerPage = $scope.numPerPage;
        $scope.resourceUrl = Restangular.one('app', $scope.app._id).all($scope.resourceName).getRestangularUrl();
        $scope.resourceInfo = {
          title: $scope.resourceTitle,
          name: $scope.resourceName
        };
      }
    ]
  };
});

/**
 * Establish the resource scope.
 * @param $scope
 * @param $stateParams
 * @param Formio
 */
var formioResourceScope = function($scope, $state, $stateParams, Formio, FormioAlerts) {

  // Tests if the tab should be active.
  $scope.isActive = function(state) {
    return $state.current.name.indexOf(state) !== -1;
  };

  // Perform Camel Case.
  var camelCase = function(input) {
    return input.toLowerCase().replace(/ (.)/g, function(match, group1) {
      return group1.toUpperCase();
    });
  };

  // Application information.
  $scope.appId = $stateParams.appId;

  // Resource information.
  $scope.resourceId = $stateParams.id;
  $scope.resourceName = $stateParams.resourceInfo.name;
  $scope.resourceUrl = '/app/' + $stateParams.appId + '/' + $stateParams.resourceInfo.name;
  $scope.resourceUrl += $stateParams.id ? ('/' + $stateParams.id) : '';
  $scope.resourceInfo = $stateParams.resourceInfo;
  $scope.resource = {title: '', components: []};

  // Attach the name to the title of the resource.
  $scope.$watch('resource.title', function() {
    $scope.resource.name = $scope.resource.title ? camelCase($scope.resource.title) : '';
  });

  // Load the resource and submissions.
  $scope.formio = new Formio($scope.resourceUrl);

  // Load the resource.
  $scope.formio.loadForm().then(function(resource) {
    $scope.resource = resource;
  });

  /**
   * Used to save a new resource.
   */
  $scope.saveResource = function() {
    $scope.formio.saveForm($scope.resource).then(function(resource) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Successfully created form!'
      });
      $state.go('app.' + $stateParams.resourceInfo.name + '.view', {id: resource._id});
    }, FormioAlerts.onError.bind(FormioAlerts));
  };
};

app.controller('ResourceController', [
  '$scope',
  '$state',
  '$stateParams',
  'Formio',
  'FormioAlerts',
  formioResourceScope
]);

app.controller('ResourceViewController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      $state.go('app.' + $scope.resourceInfo.name + '.submission.item.view', {subId: submission._id});
    });
  }
]);

app.controller('ResourceDeleteController', [
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
    $scope.deleteResource = function() {
      $scope.formio.deleteForm().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Delete successfull.'
        });
        $state.go('app.' + $scope.resourceInfo.name + '.index');
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ResourceAPIController', [
  '$scope',
  '$state',
  function(
    $scope,
    $state
  ) {
    $state.transitionTo('app.' + $scope.resourceInfo.name + '.api.spec', {
      appId: $scope.appId,
      id: $scope.resourceId
    });
  }
]);

app.controller('ResourceAPISpecController', [
  '$scope',
  'AppConfig',
  function(
    $scope,
    AppConfig
  ) {
    $scope.getSwaggerURL = function() {
      return AppConfig.appBase + '/form/' + $scope.resource._id + '/spec.html';
    };
  }
]);

app.controller('ResourceActionIndexController', [
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
        $state.go('app.' + $scope.resourceInfo.name + '.action.add', {
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
  $scope.actionPath = '';
  $scope.actionInfo = $stateParams.actionInfo || {settingsForm: {}};
  $scope.action = {data: {settings: {}}};

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
      $scope.actionPath = $scope.formio.formPath + '/action/' + $stateParams.actionId;
      var loader = new Formio($scope.actionPath);
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

app.controller('ResourceActionAddController', [
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
      $state.go('app.' + $scope.resourceInfo.name + '.action.index');
    });
  }
]);

app.controller('ResourceActionEditController', [
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
      $state.go('app.' + $scope.resourceInfo.name + '.action.index');
    });
  }
]);

app.controller('ResourceActionDeleteController', [
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
    $scope.actionPath = $scope.formio.formPath + '/action/' + $stateParams.actionId;
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({type: 'success', message: 'Action was deleted.'});
      $state.go('app.' + $scope.resourceInfo.name + '.action.index');
    });
  }
]);

app.controller('ResourceSubmissionsController', [
  '$scope',
  '$state',
  function(
    $scope,
    $state
  ) {
    $scope.$on('submissionView', function(event, submission) {
      $state.go('app.' + $scope.resourceInfo.name + '.submission.item.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go('app.' + $scope.resourceInfo.name + '.submission.item.edit', {
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go('app.' + $scope.resourceInfo.name + '.submission.item.delete', {
        subId: submission._id
      });
    });
  }
]);

app.controller('ResourceSubmissionController', [
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
    $scope.submissionUrl = $scope.resourceUrl;
    $scope.submissionUrl += $stateParams.subId ? ('/submission/' + $stateParams.subId) : '';
    $scope.submissionData = Formio.submissionData;
    $scope.submission = {};

    // Load the resource and submissions.
    $scope.formio = new Formio($scope.submissionUrl);

    // Load the submission.
    $scope.formio.loadSubmission().then(function(submission) {
      $scope.submission = submission;
    });
  }
]);

app.controller('ResourceSubmissionEditController', [
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
      $state.go('app.' + $scope.resourceInfo.name + '.submission.index', {id: $scope.resourceId});
    });

    $scope.deleteSubmission = function() {
      $scope.formio.deleteSubmission().then(function() {
        $state.go('app.' + $scope.resourceInfo.name + '.submission.index', {id: $scope.resourceId});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ResourceSubmissionDeleteController', [
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
      $state.go('app.' + $scope.resourceInfo.name + '.submission.index');
    });

    $scope.$on('cancel', function() {
      $state.go('app.' + $scope.resourceInfo.name + '.submission.item.view');
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });
  }
]);
