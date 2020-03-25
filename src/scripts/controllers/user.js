'use strict';

var app = angular.module('formioApp.controllers.user', []);

app.controller('UserAuthController', [
  '$scope',
  'AppConfig',
  function(
    $scope,
    AppConfig
  ) {
    $scope.isFormio = ['form.io', 'test-form.io'].indexOf(AppConfig.serverHost) !== -1;
    $scope.serverHost = AppConfig.serverHost;
  }
]);

app.controller('UserLoginController', [
  '$scope',
  '$state',
  '$rootScope',
  'GoogleAnalytics',
  'AppConfig',
  function(
    $scope,
    $state,
    $rootScope,
    GoogleAnalytics,
    AppConfig
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $rootScope.user = submission;
      if (!AppConfig.onPremise) {
        GoogleAnalytics.sendEvent('User', 'login', null, 1);
      }
      $state.go('home');
    });
  }
]);

app.controller('UserRegisterController', [
  '$scope',
  '$state',
  '$rootScope',
  'GoogleAnalytics',
  '$window',
  'AppConfig',
  function(
    $scope,
    $state,
    $rootScope,
    GoogleAnalytics,
    $window,
    AppConfig
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $rootScope.user = submission;
      if (!AppConfig.onPremise) {
        GoogleAnalytics.sendEvent('User', 'register', null, 1);
        if ($window && $window.google_trackConversion) {
          $window.google_trackConversion({
            google_conversion_id : 874586484,
            google_conversion_language : 'en',
            google_conversion_format : '3',
            google_conversion_color : 'ffffff',
            google_conversion_label : 'J0hUCK3dtGoQ9MKEoQM',
            google_conversion_value : 0,
            google_remarketing_only : false
          });
        }
      }
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
    $rootScope
  ) {
    $scope.resetPassFormWithToken = $rootScope.resetPassForm;
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
      // FA-771 - If the form submission response wasn't an obj escape
      // FOR-549 - Don't clobber the rootScope user with an OK response from updating payment information.
      if (typeof submission === 'string' || submission.data === 'OK') {
        return;
      }
      if (submission.owner !== submission._id && $rootScope.user) {
        return;
      }
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
        if (!$rootScope.authenticated) {
          return $q.reject('Must be logged in to get payment info.');
        }

        var formio = new Formio(AppConfig.paymentForm);
        return formio.loadSubmissions({params: {
          owner: $rootScope.user._id,
          'data.transactionStatus': 'approved',
          sort: '-created'
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
