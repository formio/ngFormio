var isNaN = require('lodash/isNaN');
var isFinite = require('lodash/isFinite');
var isEmpty = require('lodash/isEmpty');

module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'formio-wizard.html',
    scope: {
      src: '=?',
      url: '=?',
      formAction: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      hideComponents: '=?',
      disableComponents: '=?',
      formioOptions: '=?',
      options: '=?',
      storage: '=?'
    },
    link: function(scope, element) {
      // From https://siongui.github.io/2013/05/12/angularjs-get-element-offset-position/
      var offset = function(elm) {
        try {
          return elm.offset();
        }
        catch (e) {
          // Do nothing...
        }
        var rawDom = elm[0];
        var _x = 0;
        var _y = 0;
        var body = document.documentElement || document.body;
        var scrollX = window.pageXOffset || body.scrollLeft;
        var scrollY = window.pageYOffset || body.scrollTop;
        _x = rawDom.getBoundingClientRect().left + scrollX;
        _y = rawDom.getBoundingClientRect().top + scrollY;
        return {
          left: _x,
          top: _y
        };
      };

      scope.wizardLoaded = false;
      scope.wizardTop = offset(element).top;
      if (scope.wizardTop > 50) {
        scope.wizardTop -= 50;
      }
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
      '$timeout',
      function(
        $scope,
        $compile,
        $element,
        Formio,
        FormioScope,
        FormioUtils,
        $http,
        $timeout
      ) {
        $scope.options = $scope.options || {};
        Formio.setScopeBase($scope);
        var session = ($scope.storage && !$scope.readOnly) ? localStorage.getItem($scope.storage) : false;
        if (session) {
          session = angular.fromJson(session);
        }

        var storedData = {};
        var storage = {
          getItem: function(key) {
            if ($scope.options.noStorage) {
              return storedData[key];
            }
            try {
              var value = localStorage.getItem(key);
              return value ? JSON.parse(value) : false;
            }
            catch (err) {
              console.warn('error parsing json from localstorage', err);
            }
          },
          setItem: function(key, value) {
            if ($scope.options.noStorage) {
              storedData[key] = value;
              return;
            }
            if (typeof value !== 'string') {
              value = JSON.stringify(value);
            }
            localStorage.setItem(key, value);
          }
        };

        var session = ($scope.storage && !$scope.readOnly) ? storage.getItem($scope.storage) : false;
        $scope.formio = null;
        $scope.url = $scope.url || $scope.src;
        $scope.page = {};
        $scope.activePage = {};
        $scope.pages = [];
        $scope.history = [];
        $scope.hasTitles = false;
        $scope.colclass = '';
        if (!$scope.submission || !Object.keys($scope.submission).length) {
          $scope.submission = session ? {data: session.data} : {data: {}};
        }
        $scope.currentPage = session ? session.page : 0;
        $scope.formioAlerts = [];
        $scope.formioOptions = $scope.formioOptions || {};

        var getForm = function() {
          var element = $element.find('#formio-wizard-form');
          if (!element.length) {
            return {};
          }
          return element.children().scope().formioForm;
        };

        // Show the current page.
        var showPage = function(scroll) {
          // When allowing navigate on invsalid
          // prev page alert can be visible.
          // Let's clear it
          $scope.currentPage = $scope.currentPage || 0;
          $scope.showAlerts(null);
          $scope.pageWasVisited[$scope.currentPage] = true;

          $scope.wizardLoaded = false;
          $scope.page.components = [];
          $scope.page.components.length = 0;
          $timeout(function() {
            // If the page is past the components length, try to clear first.
            if ($scope.currentPage >= $scope.pages.length) {
              $scope.clear();
            }

            // Handle Local Storage Definition
            if ($scope.storage && !$scope.readOnly) {
              // If there is no localStorage object - make a new object schema
              if (!storage.getItem($scope.storage)) {
                storage.setItem($scope.storage, {
                  page: $scope.currentPage,
                  data: $scope.submission.data
                });
              }

              // if there is a localStorage object && submission.data is blank then bind localStorage to $scope
              if(storage.getItem($scope.storage) && isEmpty($scope.submission.data) == true){
                $scope.submission.data = storage.getItem($scope.storage).data;
              }

              // if there is a localStorage object | && it is data | merge the two
              if(storage.getItem($scope.storage) && isEmpty($scope.submission.data) == false){
                storage.setItem($scope.storage, {
                  page: $scope.currentPage,
                  data: $scope.submission.data
                });
              }
            }


            $scope.page.components = $scope.pages[$scope.currentPage].components;
            $scope.activePage = $scope.pages[$scope.currentPage];
            $scope.formioAlerts = [];
            if (scroll) {
              window.scrollTo(0, $scope.wizardTop);
            }
            $scope.wizardLoaded = true;
            $scope.$emit('wizardPage', $scope.currentPage);
            $timeout($scope.$apply.bind($scope));
          });
        };

        if (!$scope.form && $scope.src) {
          (new Formio($scope.src, {base: $scope.baseUrl})).loadForm().then(function(form) {
            $scope.form = form;
            if (!$scope.wizardLoaded) {
              showPage();
            }
          });
        }

        // We can be comming back with the 'prev' button.
        // Wait for the form to be loaded.
        // Then timeout to wait the loaded form to be rendered
        // before checking for errors.
        $scope.$on('formLoad', function() {
          if ($scope.pageHasErrors[$scope.currentPage]) {
            $timeout(function() {
              $scope.checkErrors();
            });
          }
        });

        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        $scope.clear = function() {
          if ($scope.storage && !$scope.readOnly) {
            storage.setItem($scope.storage, '');
          }
          $scope.submission = {data: {}};
          $scope.currentPage = 0;
          $scope.history = [];
        };

        // Check for errors.
        $scope.checkErrors = function() {
          if (!$scope.isValid()) {
            // Change all of the fields to not be pristine.
            angular.forEach($element.find('[name="formioForm"]').find('*'), function(element) {
              var elementScope = angular.element(element).scope();
              if (!elementScope || !elementScope.component) {
                return;
              }
              var fieldForm = elementScope.formioForm;
              if (!fieldForm) {
                return;
              }
              if (fieldForm[elementScope.component.key]) {
                fieldForm[elementScope.component.key].$pristine = false;
              }
            });
            $scope.formioAlerts = [{
              type: 'danger',
              message: 'Please fix the following errors before proceeding.'
            }];
            return true;
          }
          return false;
        };

        // Submit the submission.
        $scope.submit = function() {
          if ($scope.checkErrors()) {
            return;
          }

          // We want to submit, but free navigation is enabled.
          // Lets check if previous pages where not visited or has errors.
          // If find one, stop searching, go to that page and do not continue with the submission.
          if ($scope.formioOptions.wizardFreeNavigation) {
            var backToPage = null;
            for (var i = 0; i < $scope.pages.length; i++) {
              if ($scope.pageHasErrors[i] || !$scope.pageWasVisited[i]) {
                backToPage = i;
                break;
              }
            }
            if (backToPage !== null) {
              return $scope.goto(backToPage);
            }
          }

          FormioUtils.alter('submit', $scope, $scope.submission, function(err) {
            if (err) {
              return this.showAlerts(err.alerts);
            }

            // Create a sanitized submission object.
            var submissionData = {data: {}};
            if ($scope.submission._id) {
              submissionData._id = $scope.submission._id;
            }
            if ($scope.submission.data._id) {
              submissionData._id = $scope.submission.data._id;
            }

            var grabIds = function(input) {
              if (!input) {
                return [];
              }

              if (!(input instanceof Array)) {
                input = [input];
              }

              var final = [];
              input.forEach(function(element) {
                if (element && element._id) {
                  final.push(element._id);
                }
              });

              return final;
            };

            var defaultPermissions = {};
            FormioUtils.eachComponent($scope.form.components, function(component) {
              if (component.type === 'resource' && component.key && component.defaultPermission) {
                defaultPermissions[component.key] = component.defaultPermission;
              }
              if (submissionData.data.hasOwnProperty(component.key) && (component.type === 'number')) {
                var value = $scope.submission.data[component.key];
                if (component.type === 'number') {
                  submissionData.data[component.key] = value ? parseFloat(value) : 0;
                }
                else {
                  submissionData.data[component.key] = value;
                }
              }
            }, true);

            angular.forEach($scope.submission.data, function(value, key) {
              submissionData.data[key] = value;

              // Setup the submission access.
              var perm = defaultPermissions[key];
              if (perm) {
                submissionData.access = submissionData.access || [];

                // Coerce value into an array for plucking.
                if (!(value instanceof Array)) {
                  value = [value];
                }

                // Try to find and update an existing permission.
                var found = false;
                submissionData.access.forEach(function(permission) {
                  if (permission.type === perm) {
                    found = true;
                    permission.resources = permission.resources || [];
                    permission.resources.concat(grabIds(value));
                  }
                });

                // Add a permission, because one was not found.
                if (!found) {
                  submissionData.access.push({
                    type: perm,
                    resources: grabIds(value)
                  });
                }
              }
            });
            // Strip out any angular keys.
            submissionData = angular.copy(submissionData);

            var submitEvent = $scope.$emit('formSubmit', submissionData);
            if (submitEvent.defaultPrevented) {
              // Listener wants to cancel the form submission
              return;
            }

            var onDone = function(submission) {
              if ($scope.storage && !$scope.readOnly) {
                storage.setItem($scope.storage, '');
              }
              $scope.showAlerts({
                type: 'success',
                message: 'Submission Complete!'
              });
              $scope.$emit('formSubmission', submission);
            };

            // Save to specified action.
            if ($scope.action) {
              var method = submissionData._id ? 'put' : 'post';
              $http[method]($scope.action, submissionData).then(function(submission) {
                Formio.clearCache();
                onDone(submission);
              }, FormioScope.onError($scope, $element));
            }
            else if ($scope.formio && !$scope.formio.noSubmit) {
              $scope.formio.saveSubmission(submissionData).then(onDone).catch(FormioScope.onError($scope, $element));
            }
            else {
              onDone(submissionData);
            }
          }.bind(this));
        };

        $scope.cancel = function() {
          if(confirm('Are you sure you want to cancel?')){
            $scope.clear();
            FormioUtils.alter('cancel', $scope, function(err) {
              if (err) {
                return this.showAlerts(err.alerts);
              }
              showPage(true);
              $scope.$emit('cancel');
            }.bind(this));
          }
          else {
            return;
          }
        };

        $scope.pageHasErrors = {};
        $scope.pageWasVisited = {};

        $scope.getPageByKey = function(key) {
          var pageIndex = 0;
          angular.forEach($scope.pages, function(page, index) {
            if (page.key === key) {
              pageIndex = index;
              return false;
            }
          });
          return pageIndex;
        };

        /* eslint-disable max-depth */
        $scope.getNextPage = function() {
          var nextPage = $scope.currentPage;
          nextPage++;
          var currentPage = $scope.pages[$scope.currentPage];
          if (currentPage.nextPage) {
            var page = 0;
            // Allow for script execution.
            if (typeof currentPage.nextPage === 'string') {
              try {
                var next = nextPage;
                eval('(function(data) {' + currentPage.nextPage.toString() + '})($scope.submission.data)');
                page = next;
                if (!isNaN(parseInt(page, 10)) && isFinite(page)) {
                  return page;
                }
                if (typeof page !== 'string') {
                  return page;
                }

                // Assume they passed back the key of the page to go to.
                return $scope.getPageByKey(page);
              }
              catch (e) {
                /* eslint-disable no-console */
                console.warn('An error occurred in a custom nextPage function statement for component ' + $scope.page.key, e);
                /* eslint-enable no-console */
                return page;
              }
            }
            // Or use JSON Logic.
            else {
              var result = FormioUtils.jsonLogic.apply(currentPage.nextPage, {
                data: $scope.submission.data,
                page: page,
                form: $scope.page
              });
              var newPage = parseInt(result, 10);
              if (!isNaN(parseInt(newPage, 10)) && isFinite(newPage)) {
                return newPage;
              }

              return $scope.getPageByKey(result);
            }
          }
          return nextPage;
        };
        /* eslint-enable max-depth */

        // Move onto the next page.
        $scope.next = function() {
          var errors = $scope.checkErrors();
          if (errors) {
            $scope.$emit('formError');
            $scope.pageHasErrors[$scope.currentPage] = true;
            if (!$scope.formioOptions.wizardFreeNavigation) {
              return;
            }
          }
          else {
            $scope.pageHasErrors[$scope.currentPage] = false;
          }

          // Get the next page.
          var nextPage = $scope.getNextPage();
          if (nextPage >= $scope.pages.length) {
            nextPage = $scope.pages.length - 1;
          }
          if (nextPage < 0) {
            nextPage = 0;
          }

          $scope.history.push($scope.currentPage);
          $scope.currentPage = nextPage;
          FormioUtils.alter('nextPage', $scope, function(err) {
            if (err) {
              return this.showAlerts(err.alerts);
            }
            showPage(true);
            $scope.$emit('wizardNext', $scope.currentPage);
          }.bind(this));
        };

        // Move onto the previous page.
        $scope.prev = function() {
          // var errors = $scope.checkErrors();
          $scope.pageHasErrors[$scope.currentPage] = false;
          var prev = $scope.history.pop();
          $scope.currentPage = prev;
          FormioUtils.alter('prevPage', $scope, function(err) {
            if (err) {
              return this.showAlerts(err.alerts);
            }
            showPage(true);
            $scope.$emit('wizardPrev', $scope.currentPage);
          }.bind(this));
        };

        $scope.goto = function(page) {
          if (page < 0) {
            return;
          }
          if (page >= $scope.pages.length) {
            return;
          }
          var errors = $scope.checkErrors();
          $scope.pageHasErrors[$scope.currentPage] = errors;
          $scope.currentPage = page;
          showPage(true);
        };

        $scope.isValid = function() {
          return getForm().$valid;
        };

        $scope.$on('wizardGoToPage', function(event, page) {
          $scope.goto(page);
        });

        var updatePages = function() {
          if ($scope.pages.length > 6) {
            $scope.margin = ((1 - ($scope.pages.length * 0.0833333333)) / 2) * 100;
            $scope.colclass = 'col-sm-1';
          }
          else {
            $scope.margin = ((1 - ($scope.pages.length * 0.1666666667)) / 2) * 100;
            $scope.colclass = 'col-sm-2';
          }
        };

        var allPages = [];
        var hasConditionalPages = false;
        var setForm = function(form) {
          $scope.pages = [];
          angular.forEach(form.components, function(component) {
            // Only include panels for the pages.
            if (component.type === 'panel') {
              if (!$scope.hasTitles && component.title) {
                $scope.hasTitles = true;
              }
              if (FormioUtils.hasCondition(component)) {
                hasConditionalPages = true;
              }
              // Make sure this page is not in the hide compoenents array.
              if (
                ($scope.hideComponents) &&
                (component.key) &&
                ($scope.hideComponents.indexOf(component.key) !== -1)
              ) {
                return;
              }
              allPages.push(component);
              $scope.pages.push(component);
            }
          });

          // FOR-71
          if (!$scope.options.building) {
            $scope.$watch('submission.data', function(data) {
              if (hasConditionalPages) {
                var newPages = [];
                angular.forEach(allPages, function(page) {
                  if (FormioUtils.isVisible(page, null, data)) {
                    newPages.push(page);
                  }
                });
                $scope.pages = newPages;
                updatePages();
                setTimeout($scope.$apply.bind($scope), 10);
              }

              // Calculate values for hidden fields outside of wizard.
              angular.forEach(form.components, function(component) {
                if (component.type !== 'panel') {
                  FormioUtils.checkCalculated(component, $scope.submission, $scope.submission.data);
                }
              });
            }, true);
          }

          $scope.form = $scope.form ? angular.merge($scope.form, angular.copy(form)) : angular.copy(form);
          $scope.page = angular.copy(form);
          $scope.page.display = 'form';
          $scope.$emit('wizardFormLoad', form);
          updatePages();
          showPage();
        };

        // FOR-71
        if (!$scope.options.building) {
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
            $scope.formio = new Formio(formUrl, {base: $scope.baseUrl});
            if ($scope.url) {
              $scope.formio.noSubmit = true;
            }
            setForm(form);
          });
        }

        // When the components length changes update the pages.
        $scope.$watch('form.components.length', updatePages);

        // Load the form.
        if ($scope.src) {
          $scope.formio = new Formio($scope.src, {base: $scope.baseUrl});
          $scope.formio.loadForm().then(function(form) {
            setForm(form);
          });
        }
        else {
          $scope.src = '';
          $scope.formio = new Formio($scope.src, {base: $scope.baseUrl});
          if ($scope.url) {
            $scope.formio.noSubmit = true;
          }
        }
      }
    ]
  };
};
