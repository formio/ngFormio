'use strict';
angular.module('formioApp')
  .provider('Environments', [function() {
    var environments = JSON.parse(localStorage.getItem('environments')) || []; // Load from localStorage
    var currentEnvironment = JSON.parse(localStorage.getItem('currentEnvironment'));

    var addEnvironment = function(env) {
      environments.push(env);
      localStorage.setItem('environments', JSON.stringify(environments));
    };

    var removeEnvironment = function(index) {
      environments.splice(index);
      localStorage.setItem('environments', JSON.stringify(environments));
    };

    var setCurrentEnvironment = function(environment) {
      if (environment) {
        localStorage.setItem('currentEnvironment', JSON.stringify(environment));
      }
      else {
        localStorage.removeItem('currentEnvironment');
      }
    };

    this.$get = [function() {
      return {
        environments: environments,
        currentEnvironment: currentEnvironment,
        addEnvironment: addEnvironment,
        removeEnvironment: removeEnvironment,
        setCurrentEnvironment: setCurrentEnvironment
      };
    }];
  }])
  .run([
    '$rootScope',
    'Environments',
    function($rootScope, Environments) {
      if (Environments.currentEnvironment) {
        $rootScope.onPrem = true;
      }
    }
  ])
  .controller('environmentSwitcher', [
    '$scope',
    '$window',
    '$state',
    'Environments',
    'Formio',
    function ($scope, $window, $state, Environments, Formio) {
      $scope.environments = Environments.environments;
      $scope.currentEnvironment = Environments.currentEnvironment;
      $scope.environmentTypes = ['Subdomains', 'Subdirectories', 'ProjectId'];
      $scope.switchEnvironment = function(environment) {
        if($window.confirm('Changing environments will switch backend servers and log you out. Are you sure?')) {
          Environments.setCurrentEnvironment(environment);
          Formio.logout();
          $state.go('home');
          $window.location.reload();
        }
      };
      $scope.addEnvironment = function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.environment = {};
        $scope.addingEnvironment = true;
      };
      $scope.removeEnvironment = function($event, index) {
        $event.preventDefault();
        $event.stopPropagation();
        Environments.removeEnvironment(index);
      };
      $scope.saveEnvironment = function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        var valid = true;
        $scope.errors = {};
        $scope.errors.nameRequired = !$scope.environment.name;
        $scope.errors.urlRequired = !$scope.environment.url;
        $scope.errors.typeRequired = !$scope.environment.type;
        if ($scope.environment.url) {
          var parts = $scope.environment.url.split('://');
          if (parts.length !== 2) {
            $scope.errors.urlInvalid = true;
          }
          else if (!(parts[0] === 'https' || parts[0] === 'http')) {
            $scope.errors.urlInvalid = true;
          }
          var parser = document.createElement('a');
          parser.href = $scope.environment.url;
          if (parser.hostname === 'localhost') {
            $scope.errors.localhost = true;
          }
        }
        valid = !$scope.errors.nameRequired && !$scope.errors.urlRequired && !$scope.errors.urlInvalid && !$scope.errors.urlParts && !$scope.errors.localhost;
        if (valid) {
          Environments.addEnvironment($scope.environment);
          $scope.addingEnvironment = false;
        }
      };
      $scope.cancelEnvironment = function() {
        $scope.addingEnvironment = false;
      };
      $scope.typeClick = function($event) {
        // Keep the dropdown from closing.
        $event.preventDefault();
        $event.stopPropagation();
      };
    }
  ]);
