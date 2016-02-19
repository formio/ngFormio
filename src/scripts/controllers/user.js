'use strict';

var app = angular.module('formioApp.controllers.user', []);

app.controller('UserLoginController', [
  '$scope',
  '$state',
  '$rootScope',
  'GoogleAnalytics',
  function(
    $scope,
    $state,
    $rootScope,
    GoogleAnalytics
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $rootScope.user = submission;
      GoogleAnalytics.sendEvent('User', 'login', null, 1);
      $state.go('home');
    });
  }
]);

app.controller('UserRegisterController', [
  '$scope',
  '$state',
  '$rootScope',
  'GoogleAnalytics',
  function(
    $scope,
    $state,
    $rootScope,
    GoogleAnalytics
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $rootScope.user = submission;
      GoogleAnalytics.sendEvent('User', 'register', null, 1);
      $state.go('home');
    });
  }
]);

app.controller('ResetPasswordSendController', [
  '$scope',
  '$state',
  '$rootScope',
  function(
    $scope,
    $state
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $state.go('auth-resetpass-send-done');
    });
  }
]);

app.controller('ResetPasswordController', [
  '$scope',
  '$state',
  '$rootScope',
  '$stateParams',
  function(
    $scope,
    $state,
    $rootScope,
    $stateParams
  ) {
    $scope.resetPassFormWithToken = $rootScope.resetPassForm + '?x-jwt-token=' + $stateParams['x-jwt-token'];
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $state.go('auth-resetpass-done');
    });
  }
]);

app.controller('ProfileController', [
  '$scope',
  '$rootScope',
  'Formio',
  function(
    $scope,
    $rootScope,
    Formio
  ) {
    $scope.isLinked = function() {
      if(!$scope.user) return false;
      return !!(_.find($scope.user.externalIds, {type: 'github'}));
    };

    $scope.userLoading = true;
    Formio.currentUser().then(function(user) {
      $rootScope.user = user;
      Formio.setUser(user); // Update the cached user in localstorage.
      $scope.profileUrl = $rootScope.userForm + '/submission/' + $rootScope.user._id;
      $scope.userLoading = false;
    });

    $scope.$on('formSubmission', function(event, submission) {
      $rootScope.user = submission;
      Formio.setUser(submission); // Update the cached user in localstorage.
    });
  }
]);

app.controller('ProfilePaymentController', [
  '$scope',
  '$state',
  '$rootScope',
  'Formio',
  'FormioAlerts',
  'UserInfo',
  'AppConfig',
  function(
    $scope,
    $state,
    $rootScope,
    Formio,
    FormioAlerts,
    UserInfo,
    AppConfig
  ) {
    $scope.paymentForm = AppConfig.paymentForm;
    $scope.capitalize = _.capitalize;

    var loadPaymentInfo = function() {
      $scope.paymentInfoLoading = true;
      UserInfo.getPaymentInfo()
      .then(function(paymentInfo) {
        $scope.paymentInfo = paymentInfo;
        $scope.paymentInfoLoading = false;
      })
      .catch(FormioAlerts.onError.bind(FormioAlerts));
    };

    loadPaymentInfo();

    $scope.$on('formSubmission', function() {
      $state.go('profile.payment.view');
      loadPaymentInfo();
    });
  }
]);

app.factory('UserInfo', [
  'Formio',
  'AppConfig',
  '$rootScope',
  '$q',
  function(
    Formio,
    AppConfig,
    $rootScope,
    $q
  ) {
    return {
      getPaymentInfo: function() {
        if (!$rootScope.user) $q.reject('Must be logged in to get payment info.');

        var formio = new Formio(AppConfig.paymentForm);
        return formio.loadSubmissions({params: {
          owner: $rootScope.user._id
        }})
        .then(function(submissions) {
          if(!submissions || !submissions.length) {
            return null;
          }
          return submissions[0].data;
        });
      }
    };
  }
]);
