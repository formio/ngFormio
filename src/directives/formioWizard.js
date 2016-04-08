module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'formio-wizard.html',
    scope: {
      src: '=?',
      formAction: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      hideComponents: '=?',
      formioOptions: '=?',
      storage: '=?'
    },
    link: function(scope, element) {
      scope.wizardLoaded = false;
      scope.wizardElement = angular.element('.formio-wizard', element);
    },
    controller: [
      '$scope',
      '$compile',
      '$element',
      'Formio',
      'FormioScope',
      'FormioUtils',
      '$http',
      function(
        $scope,
        $compile,
        $element,
        Formio,
        FormioScope,
        FormioUtils,
        $http
      ) {
        var session = ($scope.storage && !$scope.readOnly) ? localStorage.getItem($scope.storage) : false;
        if (session) {
          session = angular.fromJson(session);
        }

        $scope.formio = null;
        $scope.page = {};
        $scope.pages = [];
        $scope.hasTitles = false;
        $scope.colclass = '';
        if (!$scope.submission || !Object.keys($scope.submission.data).length) {
          $scope.submission = session ? {data: session.data} : {data: {}};
        }
        $scope.currentPage = session ? session.page : 0;

        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        $scope.clear = function() {
          if ($scope.storage && !$scope.readOnly) {
            localStorage.setItem($scope.storage, '');
          }
          $scope.submission = {data: {}};
          $scope.currentPage = 0;
        };

        // Show the current page.
        var showPage = function() {
          // If the page is past the components length, try to clear first.
          if ($scope.currentPage >= $scope.form.components.length) {
            $scope.clear();
          }

          $scope.wizardLoaded = false;
          if ($scope.storage && !$scope.readOnly) {
            localStorage.setItem($scope.storage, angular.toJson({
              page: $scope.currentPage,
              data: $scope.submission.data
            }));
          }
          $scope.page.components = $scope.form.components[$scope.currentPage].components;
          var pageElement = angular.element(document.createElement('formio'));
          $scope.wizardElement.html($compile(pageElement.attr({
            src: "'" + $scope.src + "'",
            form: 'page',
            submission: 'submission',
            'read-only': 'readOnly',
            'hide-components': 'hideComponents',
            'formio-options': 'formioOptions',
            id: 'formio-wizard-form'
          }))($scope));
          $scope.wizardLoaded = true;
          $scope.formioAlerts = [];
          window.scrollTo(0, 0);
          $scope.$emit('wizardPage', $scope.currentPage);
        };

        // Check for errors.
        $scope.checkErrors = function() {
          if (!$scope.isValid()) {
            // Change all of the fields to not be pristine.
            angular.forEach($element.find('[name="formioFieldForm"]').children(), function(element) {
              var elementScope = angular.element(element).scope();
              var fieldForm = elementScope.formioFieldForm;
              if (fieldForm[elementScope.component.key]) {
                fieldForm[elementScope.component.key].$pristine = false;
              }
            });
            $scope.formioAlerts.push({
              type: 'danger',
              message: 'Please fix the following errors before proceeding.'
            });
            return true;
          }
          return false;
        };

        // Submit the submission.
        $scope.submit = function() {
          if ($scope.checkErrors()) {
            return;
          }
          var sub = angular.copy($scope.submission);
          FormioUtils.eachComponent($scope.form.components, function(component) {
            if (sub.data.hasOwnProperty(component.key) && (component.type === 'number')) {
              if (sub.data[component.key]) {
                sub.data[component.key] = parseFloat(sub.data[component.key]);
              }
              else {
                sub.data[component.key] = 0;
              }
            }
          });

          var onDone = function(submission) {
            if ($scope.storage && !$scope.readOnly) {
              localStorage.setItem($scope.storage, '');
            }
            $scope.$emit('formSubmission', submission);
          };

          // Save to specified action.
          if ($scope.action) {
            var method = sub._id ? 'put' : 'post';
            $http[method]($scope.action, sub).success(function(submission) {
              Formio.clearCache();
              onDone(submission);
            }).error(FormioScope.onError($scope, $element));
          }
          else if ($scope.formio) {
            $scope.formio.saveSubmission(sub).then(onDone).catch(FormioScope.onError($scope, $element));
          }
          else {
            onDone(sub);
          }
        };

        $scope.cancel = function() {
          $scope.clear();
          showPage();
        };

        // Move onto the next page.
        $scope.next = function() {
          if ($scope.checkErrors()) {
            return;
          }
          if ($scope.currentPage >= ($scope.form.components.length - 1)) {
            return;
          }
          $scope.currentPage++;
          showPage();
          $scope.$emit('wizardNext', $scope.currentPage);
        };

        // Move onto the previous page.
        $scope.prev = function() {
          if ($scope.currentPage < 1) {
            return;
          }
          $scope.currentPage--;
          showPage();
          $scope.$emit('wizardPrev', $scope.currentPage);
        };

        $scope.goto = function(page) {
          if (page < 0) {
            return;
          }
          if (page >= $scope.form.components.length) {
            return;
          }
          $scope.currentPage = page;
          showPage();
        };

        $scope.isValid = function() {
          var element = $element.find('#formio-wizard-form');
          if (!element.length) {
            return false;
          }
          var formioForm = element.children().scope().formioForm;
          return formioForm.$valid;
        };

        $scope.$on('wizardGoToPage', function(event, page) {
          $scope.goto(page);
        });

        var setForm = function(form) {
          $scope.pages = [];
          angular.forEach(form.components, function(component) {
            // Only include panels for the pages.
            if (component.type === 'panel') {
              if (!$scope.hasTitles && component.title) {
                $scope.hasTitles = true;
              }
              $scope.pages.push(component);
            }
          });

          $scope.form = angular.merge($scope.form, angular.copy(form));
          $scope.form.components = $scope.pages;
          $scope.page = angular.copy(form);
          $scope.page.display = 'form';
          if ($scope.pages.length > 6) {
            $scope.margin = ((1 - ($scope.pages.length * 0.0833333333)) / 2) * 100;
            $scope.colclass = 'col-sm-1';
          }
          else {
            $scope.margin = ((1 - ($scope.pages.length * 0.1666666667)) / 2) * 100;
            $scope.colclass = 'col-sm-2';
          }

          $scope.$emit('wizardFormLoad', form);
          showPage();
        };

        $scope.$watch('form', function(form) {
          if (
            $scope.src ||
            !form ||
            !Object.keys(form).length ||
            !form.components ||
            !form.components.length
          ) {
            return;
          }
          var formUrl = form.project ? '/project/' + form.project : '';
          formUrl += '/form/' + form._id;
          $scope.formio = new Formio(formUrl);
          setForm(form);
        });

        // Load the form.
        if ($scope.src) {
          $scope.formio = new Formio($scope.src);
          $scope.formio.loadForm().then(function(form) {
            setForm(form);
          });
        }
        else {
          $scope.src = '';
          $scope.formio = new Formio($scope.src);
        }
      }
    ]
  };
};
