'use strict';
import jsonpatch from 'fast-json-patch';
import DOMPurify from 'dompurify';
import moment from 'moment';
import { Utils } from 'formiojs';

/* global _: false, document: false, Promise: false, jsonpatch: false, DOMPurify: false */
var app = angular.module('formioApp.controllers.form', [
  'ngDialog',
  'ui.bootstrap.tabs',
  'ui.bootstrap.tpls',
  'ui.bootstrap.accordion',
  'ui.bootstrap.pagination',
  'formio',
  'bgf.paginateAnything',
  'ngTagsInput',
  'formioApp.controllers.pdf'
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
        help: 'https://help.form.io/userguide/forms/',
        description: 'Forms serve as an input interface for Resources as well as free-form user input within your Application. Example: Login Form, Contact Form, etc.'
      },
      resource: {
        type: 'resource',
        title: 'Resources',
        name: 'Resource',
        icon: 'fa fa-database',
        help: 'https://help.form.io/userguide/resources/',
        description: 'Resources are the objects within your Application. Example: User, Company, Vehicle, etc.'
      }
    };

    // Create states for both forms and resources.
    angular.forEach(['resource', 'form'], function(type) {
      var parentName = 'project.' + type;
      if (type === 'form') {
        $stateProvider
          .state(parentName + '.index', {
            url: '/',
            templateUrl: 'views/form/forms.html',
            controller: [
              '$scope',
              function($scope) {
                $scope.loadProjectPromise.then(function() {
                  $scope.ready = true;
                });
              }
            ]
          })
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
                $scope.infoTemplate = 'views/form/form-info.html';
                $scope.currentSection.title = _.capitalize($scope.formInfo.type) + 's';
                $scope.currentSection.icon = ($scope.formInfo.type === 'form') ? 'fa fa-tasks' : 'fa fa-database';
                $scope.currentSection.help = $scope.formInfo.help;
              }
            ],
            data: typeInfo[type]
          })

      }
      else {
        $stateProvider
          .state(parentName + '.index', {
            url: '/',
            templateUrl: 'views/form/resources.html',
            controller: [
              '$scope',
              function($scope) {
                $scope.loadProjectPromise.then(function() {
                  $scope.ready = true;
                });
              }
            ]
          })
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
                $scope.infoTemplate = 'views/form/resource-info.html';
                $scope.currentSection.title = _.capitalize($scope.formInfo.type) + 's';
                $scope.currentSection.icon = ($scope.formInfo.type === 'form') ? 'fa fa-tasks' : 'fa fa-database';
                $scope.currentSection.help = $scope.formInfo.help;
              }
            ],
            data: typeInfo[type]
          })

      }
      $stateProvider
        .state(parentName + '.new', {
          url: '/new/' + type,
          templateUrl: 'views/form/new.html',
          controller: 'FormController',
          params: {
            formType: type,
            newForm: true
          }
        })
        .state(parentName + '.create', {
          url: '/create/' + type,
          templateUrl: 'views/form/form-edit.html',
          controller: 'FormController',
          params: {
            formType: type,
            components: null,
            display: null,
            properties: null,
            form: null,
          }
        })
        .state(parentName + '.import', {
          url: '/import',
          templateUrl: 'views/form/form-import.html',
          controller: 'FormImportController',
          params: {
            formType: type
          }
        })
        .state(parentName + '.form', {
          abstract: true,
          url: '/:formId',
          templateUrl: 'views/form/form.html',
          controller: 'FormController'
        })
        .state(parentName + '.form.view', {
          url: '/',
          controller: 'FormViewController',
          templateUrl: 'views/form/form-view.html',
          params: {
            revision: null
          }
        })
        .state(parentName + '.form.edit', {
          url: '/edit',
          controller: 'FormEditController',
          templateUrl: 'views/form/form-edit.html',
          params: {
            components: null
          }
        })
        .state(parentName + '.form.revisions', {
          url: '/revision',
          controller: 'FormRevisionsController',
          templateUrl: 'views/form/form-revisions.html'
        })
        .state(parentName + '.form.embed', {
          url: '/embed',
          controller: 'FormEmbedController',
          templateUrl: 'views/form/form-embed.html'
        })
        .state(parentName + '.form.share', {
          url: '/share',
          templateUrl: 'views/form/form-share.html',
          controller: 'FormShareController'
        })
        .state(parentName + '.form.delete', {
          url: '/delete',
          controller: 'FormDeleteController',
          templateUrl: 'views/form/form-delete.html'
        })
        .state(parentName + '.form.permission', {
          url: '/permission',
          templateUrl: 'views/form/permission/index.html',
          controller: 'FormPermissionController'
        })
        .state(parentName + '.form.api', {
          url: '/api',
          templateUrl: 'views/form/form-api.html'
        })
        .state(parentName + '.form.settings', {
          url: '/settings',
          templateUrl: 'views/form/form-settings.html',
          controller: ['$scope', 'AppConfig', function ($scope, AppConfig) {
            $scope.disableCollection = function () {
              // Don't allow collections for hosted projects
              if (!AppConfig.onPremise) {
                return true;
              }
              if (!$scope.minPlan('commercial')) {
                return true;
              }

              if ($scope.primaryProject.plan === 'trial') {
                return true;
              }

              return false;
            };
          }]
        })
        .state(parentName + '.form.submission', {
          abstract: true,
          url: '/submission',
          template: '<div ui-view></div>'
        })
        .state(parentName + '.form.submission' + '.index', {
          url: '',
          templateUrl: 'views/form/submission/index.html',
          controller: 'FormSubmissionsController',
          params: {
            _vid: null
          }
        })
        .state(parentName + '.form.submission' + '.item', {
          abstract: true,
          url: '/:subId',
          controller: 'FormSubmissionController',
          templateUrl: 'views/form/submission/item.html'
        })
        .state(parentName + '.form.submission' + '.item.view', {
          url: '',
          templateUrl: 'views/form/submission/view.html'
        })
        .state(parentName + '.form.submission' + '.item.edit', {
          url: '/edit',
          templateUrl: 'views/form/submission/edit.html',
          controller: 'FormSubmissionEditController'
        })
        .state(parentName + '.form.submission' + '.item.delete', {
          url: '/delete',
          templateUrl: 'views/form/submission/delete.html',
          controller: 'FormSubmissionDeleteController'
        })
        .state(parentName + '.form.action', {
          abstract: true,
          url: '/action',
          template: '<div ui-view></div>'
        })
        .state(parentName + '.form.action' + '.index', {
          url: '',
          templateUrl: 'views/form/action/index.html',
          controller: 'FormActionIndexController',
          params: {
            _vid: null
          }
        })
        .state(parentName + '.form.action' + '.item', {
          abstract: true,
          url: '/:actionId',
          templateUrl: 'views/form/action/item.html'
        })
        .state(parentName + '.form.action' + '.item.view', {
          url: '',
          templateUrl: 'views/form/action/view.html'
        })
        .state(parentName + '.form.action' + '.item.edit', {
          url: '/edit',
          templateUrl: 'views/form/action/edit.html',
          controller: 'FormActionEditController'
        })
        .state(parentName + '.form.action' + '.item.delete', {
          url: '/delete',
          templateUrl: 'views/form/action/delete.html',
          controller: 'FormActionDeleteController'
        });

      /** NOTE: Cannot have dynamic template names with webpack **/
      // var formStates = {};
      // formStates[parentName + '.form.submission'] = {
      //   path: '/submission',
      //   id: 'subId',
      //   indexController: 'FormSubmissionsController',
      //   itemController: 'FormSubmissionController',
      //   editController: 'FormSubmissionEditController',
      //   deleteController: 'FormSubmissionDeleteController'
      // };
      // formStates[parentName + '.form.action'] = {
      //   path: '/action',
      //   id: 'actionId',
      //   indexController: 'FormActionIndexController',
      //   editController: 'FormActionEditController',
      //   deleteController: 'FormActionDeleteController'
      // };
      //
      // angular.forEach(formStates, function(info, state) {
      //   $stateProvider
      //     .state(state, {
      //       abstract: true,
      //       url: info.path,
      //       template: '<div ui-view></div>'
      //     })
      //     .state(state + '.index', {
      //       url: '',
      //       templateUrl: 'views/form' + info.path + '/index.html',
      //       controller: info.indexController,
      //       params: {
      //         _vid: null
      //       }
      //     })
      //     .state(state + '.item', {
      //       abstract: true,
      //       url: '/:' + info.id,
      //       controller: info.itemController,
      //       templateUrl: 'views/form' + info.path + '/item.html'
      //     })
      //     .state(state + '.item.view', {
      //       url: '',
      //       templateUrl: 'views/form' + info.path + '/view.html'
      //     })
      //     .state(state + '.item.edit', {
      //       url: '/edit',
      //       templateUrl: 'views/form' + info.path + '/edit.html',
      //       controller: info.editController
      //     })
      //     .state(state + '.item.delete', {
      //       url: '/delete',
      //       templateUrl: 'views/form' + info.path + '/delete.html',
      //       controller: info.deleteController
      //     });
      // });

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
      formName: '=',
      forms: '=',
      formioReady: '=',
      projectUrl: '=',
      formType: '=',
      numPerPage: '=?',
      listMode: '=',
      protected: '=?',
      formio: '=?'
    },
    controller: [
      '$scope',
      '$rootScope',
      '$http',
      'AppConfig',
      'FormioUtils',
      'FormioAlerts',
      'SubmissionExport',
      function(
        $scope,
        $rootScope,
        $http,
        AppConfig,
        FormioUtils,
        FormioAlerts,
        SubmissionExport
      ) {
        $rootScope.activeSideBar = 'projects';
        $rootScope.noBreadcrumb = false;
        $rootScope.currentForm = false;
        if (!$scope.numPerPage) {
          $scope.numPerPage = 25;
        }
        $scope.totalItems = 0;
        $scope.currentPage = 1;
        $scope.search = {title: ''};
        $scope.forms = [];

        var query = {params: {
          select: '_id,title,type,path,modified,name,tags',
          limit: $scope.numPerPage,
          skip: 0
        }};
        if ($scope.formType) {
          query.params.type = $scope.formType;
        }

        var getItems = function(formio) {
          $scope.formsLoading = true;
          formio.loadForms(query).then(function (forms) {
            $scope.totalItems = forms.serverCount || 0;
            $scope.forms = forms;
            $scope.formsLoading = false;
          });
        };

        var formio = null;
        $scope.setPage = function() {
          query.params.skip = ($scope.currentPage - 1) * query.params.limit;
          if (formio) {
            return getItems(formio);
          }
          $scope.formioReady.then(function(instance) {
            formio = instance;
            getItems(instance);
          });
        };

        $scope.$watch('search.title', function(input) {
          if (input.length > 0) {
            $scope.currentPage = 1;
            query.skip = 0;
            query.params.title__regex = '/' + input + '/i';
          }
          else {
            delete query.params.title__regex;
          }
          $scope.setPage();
        });

        $scope.export = function(form, type) {
          $scope.isBusy = true;
          SubmissionExport.export($scope.formio, form, type).then(function() {
            $scope.isBusy = false;
          }).catch(function(err) {
            $scope.isBusy = false;
            console.warn(err);
            FormioAlerts.onError(err);
          });
        };
        $scope.componentCount = function(components) {
          return _(FormioUtils.flattenComponents(components)).filter(function (o) {
            return o.input === true && o.type !== 'button';
          }).size();
        };
      }
    ]
  };
});

app.directive('customOnChange', function() {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var onChangeHandler = scope.$eval(attrs.customOnChange);
      element.bind('change', onChangeHandler);
    }
  };
});

app.controller('FormController', [
  '$scope',
  '$state',
  '$stateParams',
  '$rootScope',
  'Formio',
  'FormioAlerts',
  'FormioUtils',
  'AppConfig',
  'SubmissionAccessLabels',
  'AccessLabels',
  'ResourceAccessLabels',
  'GoogleAnalytics',
  '$q',
  'ngDialog',
  'PrimaryProject',
  'Upload',
  'PDFServer',
  '$http',
  function(
    $scope,
    $state,
    $stateParams,
    $rootScope,
    Formio,
    FormioAlerts,
    FormioUtils,
    AppConfig,
    SubmissionAccessLabels,
    AccessLabels,
    ResourceAccessLabels,
    GoogleAnalytics,
    $q,
    ngDialog,
    PrimaryProject,
    Upload,
    PDFServer,
    $http
  ) {
    // Project information.
    $scope.formReady = false;
    $scope.projectId = $stateParams.projectId;
    $scope.upload = function (file) {
      $scope.uploading = true;
      $scope.formReady = false;
      $scope.primaryProjectPromise.then(function(project) {
        var filePath = '/pdf/' + project._id + '/file';
        var pdfServer = AppConfig.pdfServer;
        PDFServer.ensureFileToken(project).then(function(project) {
          if ($scope.currentProject.settings.pdfserver) {
            pdfServer = $scope.currentProject.settings.pdfserver;
          }
          Upload.upload({
            url: pdfServer + filePath,
            data: {file: file},
            headers: {'x-file-token': project.settings.filetoken}
          }).then(function (res) {
            PDFServer.clearCache();
            $scope.formReady = true;
            $scope.uploading = false;
            if (!$scope.form.settings) {
              $scope.form.settings = {};
            }
            if (res.data && res.data.path) {
              $scope.form.settings.pdf = {
                src: pdfServer + res.data.path,
                id: res.data.file
              };
            }
            if ($stateParams.newForm) {
              $scope.form.display = 'pdf';
              $state.go('project.form.create', {
                form: $scope.form
              });
            }
            ngDialog.close();
          }, function (resp) {
            FormioAlerts.onError({message: resp.data});
            $scope.uploading = false;
            ngDialog.close();
          }, function (evt) {
            $scope.uploadProgress = parseInt(100.0 * evt.loaded / evt.total);
          });
        });
      });
    };

    // Resource information.
    $scope.uploading = false;
    $scope.uploadProgress = 0;
    $scope.isCopy = !!($stateParams.components && $stateParams.components.length);
    $scope.formId = $stateParams.formId;

    $scope.removePDF = function() {
      delete $scope.form.settings.pdf;
    };

    $scope.uploadPDF = function() {
      ngDialog.open({
        template: 'views/form/upload.html',
        scope: $scope
      });

      // Determine if we have enough to upload.
      $scope.purchaseRequired = false;
      PDFServer.getAllowed($scope.primaryProjectPromise).then(function(allowed) {
        $scope.purchaseRequired = (allowed.forms - allowed.numForms) <= 0;
      });
    };
    var formType = $stateParams.formType || 'form';
    $scope.capitalize = _.capitalize;

    if ($stateParams.form) {
      $scope.form = $stateParams.form;
    }
    else {
      $scope.form = {
        title: '',
        display: $stateParams.display || 'form',
        type: formType,
        components: $stateParams.components || [],
        access: [],
        submissionAccess: [],
        settings: {},
        properties: $stateParams.properties || {},
      };
    }

    // Match name of form to title if not customized.
    $scope.titleChange = function(oldTitle) {
      if (!$scope.form.name || $scope.form.name === _.camelCase(oldTitle)) {
        $scope.form.name = _.camelCase($scope.form.title);
      }
      if (!$scope.form.path || $scope.form.path === _.camelCase(oldTitle).toLowerCase()) {
        $scope.form.path = _.camelCase($scope.form.title).toLowerCase();
      }
    };

    $scope.builderConfig = {
      baseUrl: $scope.baseUrl,
      building: true,
      sideBarScrollOffset: 60,
      resourceTag: '',
      bootstrap: 3,
      builder: {}
    };

    // The url to goto for embedding.
    $scope.iframeCode = '';
    $scope.embedCode = '';
    $scope.setiframeCode = function(gotoUrl) {
      let embedCode = '<script src="';
      if ($scope.projectUrl && AppConfig.onPremise) {
        embedCode += `${$scope.projectUrl}/manage/view/assets/lib/offline/formio.offline.min.js`;
        embedCode += `?base=${$scope.baseUrl}`;
        embedCode += `&project=${$scope.projectUrl}`;
        embedCode += '&src=';
      }
      else {
        embedCode += 'https://unpkg.com/formiojs@latest/dist/formio.embed.js?src=';
      }
      embedCode += $scope.projectUrl + '/' + $scope.form.path;
      embedCode += '"></script>';
      $scope.embedCode = embedCode;
      var iframeCode = '<script type="text/javascript">';
      iframeCode += '(function a(d, w, u) {';
      iframeCode +=    'var h = d.getElementsByTagName("head")[0];';
      iframeCode +=    'var s = d.createElement("script");';
      iframeCode +=    's.type = "text/javascript";';
      iframeCode +=    's.src = "' + AppConfig.appBase + '/lib/seamless/seamless.parent.min.js";';
      iframeCode +=    's.onload = function b() {';
      iframeCode +=        'var f = d.getElementById("formio-form-' + $scope.form._id + '");';
      iframeCode +=        'if (!f || (typeof w.seamless === u)) {';
      iframeCode +=            'return setTimeout(b, 100);';
      iframeCode +=        '}';
      iframeCode +=        'w.seamless(f, {fallback:false}).receive(function(d, e) {';
      iframeCode +=            gotoUrl ? 'window.location.href = "' + gotoUrl + '";' : '';
      iframeCode +=        '});';
      iframeCode +=    '};';
      iframeCode +=    'h.appendChild(s);';
      iframeCode += '})(document, window);';
      iframeCode += '</script>';
      if ($scope.projectUrl && AppConfig.onPremise) {
        iframeCode += '<iframe id="formio-form-' + $scope.form._id + '" style="width:100%;border:none;" height="600px" src="' + $scope.projectUrl + '/manage/view/#/' + $scope.currentProject.name + '/' + $scope.form.path + '?iframe=1&header=0"></iframe>';
      }
      else {
        iframeCode += '<iframe id="formio-form-' + $scope.form._id + '" style="width:100%;border:none;" height="600px" src="https://formview.io/#/' + $scope.currentProject.name + '/' + $scope.form.path + '?iframe=1&header=0"></iframe>';
      }
      $scope.iframeCode = iframeCode;
    };

    // Keep track of the form tags.
    $scope.formTags = [];
    $scope.addTag = function(tag) {
      if (!$scope.form) {
        return;
      }
      if (!$scope.form.tags) {
        $scope.form.tags = [];
      }
      $scope.form.tags.push(tag.text);
    };
    $scope.removeTag = function(tag) {
      if ($scope.form.tags && $scope.form.tags.length) {
        var tagIndex = $scope.form.tags.indexOf(tag.text);
        if (tagIndex !== -1) {
          $scope.form.tags.splice(tagIndex, 1);
        }
      }
    };

    // Keep track of the self access permissions.
    $scope.selfAccessPermissions = false;

    /**
     * Util function to get or set the selfAccess value. If selfAccess is present, the value is set, otherwise returned.
     *
     * @param {Boolean} setValue
     *   The value to set for selfAccess.
     *
     * @returns {boolean}
     */
    var selfAccess = function(setValue) {
      var found = false;
      for(var a = 0; a < $scope.form.submissionAccess.length; a++) {
        if (!found && $scope.form.submissionAccess[a].type === 'self') {
          // If we're setting the value to false when it exists, remove it.
          if (typeof setValue !== 'undefined' && setValue === false) {
            found = false;
            delete $scope.form.submissionAccess[a];
            $scope.form.submissionAccess = _.filter($scope.form.submissionAccess);
            break;
          }
          // If we're getting the value, flag it as found.
          // If we're setting the value to true when it exists, do nothing.
          else {
            found = true;
            break;
          }
        }
      }

      // The permission wasn't found but we're enabling it, add it to the access.
      if (!found && typeof setValue !== 'undefined' && setValue === true) {
        $scope.form.submissionAccess.push({
          type: 'self'
        });
      }

      return found;
    };

    // ng-change function to help modify the value of self access permissions.
    $scope.toggleSelfAccessPermissions = function() {
      $scope.selfAccessPermissions = !$scope.selfAccessPermissions;
      selfAccess($scope.selfAccessPermissions);
      $scope.$broadcast('permissionsChange');
    };

    $scope.$watch('form', function(form) {
      if (!form) {
        return;
      }
      $scope.setiframeCode();
      if (form.settings && form.settings.collection) {
        document.body.className += ' form-has-collection';
      }
    });

    $scope.loadProjectPromise.then(() => {
      $scope.setiframeCode();
    });

    $scope.updateCurrentFormResources = function(form) {
      // Build the list of selectable resources for the submission resource access ui.
      $scope.currentFormResources = _(FormioUtils.flattenComponents(form.components))
        .filter(function(component) {
          if (component.type === 'resource') {
            return true;
          }
          if (component.type === 'select' && ['resource', 'url'].indexOf(component.dataSrc) !== -1) {
            return true;
          }

          return false;
        })
        .map(function(component) {
          return {
            label: component.label || '',
            key: component.key || '',
            defaultPermission: component.defaultPermission || ''
          };
        })
        .value();
    };
    var loadFormQ = $q.defer();
    $scope.loadFormPromise = loadFormQ.promise;

    // Load the form and submissions.
    $scope.loadProjectPromise.then(function() {
      $scope.formUrl = $scope.projectUrl + '/form';
      $scope.formUrl += $stateParams.formId ? ('/' + $stateParams.formId) : '';
      $scope.formDisplays = [
        {
          name: 'form',
          title: 'Form'
        },
        {
          name: 'wizard',
          title: 'Wizard'
        },
        {
          name: 'pdf',
          title: 'PDF'
        }
      ];
      $scope.formio = new Formio($scope.formUrl, {
        base: $scope.baseUrl,
        project: $scope.projectUrl
      });
      // Load the form.
      if ($scope.formId) {
        loadFormQ.resolve($scope.formio.loadForm()
          .then(function(form) {
            // FOR-362 - Fix pass by reference issue with the internal cache.
            form = _.cloneDeep(form);

            // Ensure the display is form.
            if (!form.display) {
              form.display = 'form';
            }

            $scope.updateCurrentFormResources(form);

            $scope.form = form;
            $scope.form.page = 0;
            $scope.formTags = _.map(form.tags, function(tag) {
              return {text: tag};
            });

            $rootScope.currentForm = $scope.form;
            $scope.formReady = true;
            return form;
          }, FormioAlerts.onError.bind(FormioAlerts))
          .catch(FormioAlerts.onError.bind(FormioAlerts)));

        $scope.formio.loadActions()
          .then(function(actions) {
            // Get the available actions for the form, to check if premium actions are present.
            $scope.formio.availableActions().then(function(available) {
              var premium = _.map(_.filter(available, function(action) {
                return (action.hasOwnProperty('premium') && action.premium === true);
              }), 'name');

              $scope.hasPremAction = _.some(actions, function(action) {
                return (action.hasOwnProperty('name') && action.name && premium.indexOf(action.name) !== -1);
              });
            });

            $scope.actions = actions;
            $scope.hasAuthAction = actions.some(function(action) {
              return action.name === 'login' || action.name === 'oauth';
            });
          }, FormioAlerts.onError.bind(FormioAlerts))
          .catch(FormioAlerts.onError.bind(FormioAlerts));
      }
      else {
        $scope.formReady = true;
        loadFormQ.resolve();
      }

      $scope.loadFormPromise
        .then(function() {
          $scope.form.builder = false;

          // Watch for the first load of the form. Used to parse self access permissions once.
          var loaded = $scope.$watch('form.submissionAccess', function() {
            $scope.selfAccessPermissions = selfAccess();
            loaded();
          });
        });

    });

    $scope.submissionAccessLabels = SubmissionAccessLabels;
    $scope.resourceAccessLabels = ResourceAccessLabels;
    $scope.accessLabels = AccessLabels;

    // Get the swagger URL.
    $scope.getSwaggerURL = function(format) {
      return $scope.projectUrl + '/form/' + $scope.formId + '/spec.json';
    };

    //// When a submission is made.
    //$scope.$on('formSubmit', function(event, submission) {
    //  event.stopPropagation();
    //  FormioAlerts.addAlert({
    //    type: 'success',
    //    message: 'New submission added!'
    //  });
    //  GoogleAnalytics.sendEvent('Submission', 'create', null, 1);
    //  if (submission._id) {
    //    $state.go('project.' + $scope.formInfo.type + '.form.submission.item.view', {formId: submission.form, subId: submission._id});
    //  }
    //});

    // Save a form.
    $scope.saveForm = function(form) {
      form = form || $scope.form;
      angular.element('.has-error').removeClass('has-error');

      // Copy to remove angular $$hashKey
      return $scope.formio.saveForm(angular.copy(form), {
        getHeaders: true
      })
      .then(function(response) {
        const oldPage = $scope.form.page;
        if (response.result && !response.result.page) {
          response.result.page = oldPage;
        }
        $scope.form = $scope.originalForm = response.result;
        var headers = response.headers;
        var method = $stateParams.formId ? 'updated' : 'created';
        GoogleAnalytics.sendEvent('Form', method.substring(0, method.length - 1), null, 1);

        if (headers.hasOwnProperty('x-form-merge')) {
          FormioAlerts.addAlert({
            type: 'warning',
            message: 'This form has been modified by another user. All form changes have been merged and saved.'
          });
        }
        else {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Successfully ' + method + ' form!'
          });
        }

        // Reload page when a form is created or merged.
        if (method === 'created' || headers.hasOwnProperty('x-form-merge')) {
          $state.go('project.' + $scope.formInfo.type + '.form.edit', {formId: $scope.form._id}, {reload: true});
        }
        else {
          // Recalculate project modified status.
          // PrimaryProject.clear();
          // $state.go($state.current, $stateParams, { reload: true, inherit: false, notify: true });
        }
      })
      .catch(function(err) {
        // Catch if a form is returned as an error. This is a conflict.
        if (err._id && err.type) {
          throw err;
        }
        if (err) {
          FormioAlerts.onError.call(FormioAlerts, err);
        }

        // FOR-128 - if we're editing a form, make note of the components with issues.
        try {
          var issues = (/Component keys must be unique: (.*)/.exec(_.get(err, 'errors.components.message'))).slice(1);
          if (($state.includes('project.form.form.edit') || $state.includes('project.form.create')) && (issues.length > 0)) {
            issues = (issues.shift()).toString().split(', ');
            issues.forEach(function(issue) {
              angular.element('div.dropzone #' + issue).parent().addClass('has-error');
            });
          }
        }
        catch (e) {}
      });
    };

    // Delete a form.
    $scope.deleteForm = function() {
      var type = $scope.form.type;
      $scope.formio.deleteForm()
        .then(function() {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Delete successful'
          });
          $state.go('project.' + type + '.form.index');
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };

    // Called when the form is updated.
    $scope.$on('formUpdate', function(event, form) {
      event.stopPropagation();
      $scope.updateCurrentFormResources(form);
      $scope.form.components = form.components;
    });

    // Called when the form permissions is updated.
    $scope.$on('updateFormPermissions', function(event, form) {
      event.stopPropagation();
      $scope.updateCurrentFormResources(form);
      $scope.form = form;
    });


    $rootScope.currentForm = $scope.form;
  }
]);

app.controller('FormViewController', [
  '$scope',
  '$state',
  '$stateParams',
  'FormioAlerts',
  'GoogleAnalytics',
  function($scope, $state, $stateParams, FormioAlerts, GoogleAnalytics) {
    $scope.formReady = false;

    $scope.submission = {data: {}};

    $scope.loadFormPromise.then(function() {
      if ($stateParams.revision) {
        $scope.form = angular.copy($scope.form);
        $scope.form.components = $stateParams.revision.components;

        $scope.revision = $stateParams.revision;
      }
      $scope.formReady = true;
    });
    $scope.$on('formSubmission', function(event, submission) {
      if ($stateParams.revision) {
        submission._fvid = $stateParams.revision._vid;
      }
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      GoogleAnalytics.sendEvent('Submission', 'create', null, 1);
      if (submission._id) {
        $state.go('project.' + $scope.formInfo.type + '.form.submission.item.view', {formId: submission.form, subId: submission._id});
      }
      else {
        $state.go('project.' + $scope.formInfo.type + '.form.submission.index', {formId: $scope.formId});
      }
    });
  }
]);

app.controller('FormEditController', [
  '$scope',
  '$stateParams',
  '$q',
  'ngDialog',
  '$state',
  '$timeout',
  'Formio',
  'FormioAlerts',
  'GoogleAnalytics',
  function(
    $scope,
    $stateParams,
    $q,
    ngDialog,
    $state,
    $timeout,
    Formio,
    FormioAlerts,
    GoogleAnalytics
  ) {
    $scope.loadFormPromise.then(function() {
      $scope.form.builder = true;
    });

    $scope.setForm = function(form) {
      $scope.builder = true;
      $scope.form = form;
    };

    $scope.dirty = false;

    $scope.formReady = false;
    var checkDraft = function() {
      if ($scope.form.revisions) {
        // Load a draft if it is available.
        Formio.makeStaticRequest($scope.formUrl + '/draft', 'GET', null, {base: $scope.baseUrl})
          .then(function(form) {
            $scope.form.components = form.components;
            if (form._vid === 'draft') {
              $scope.draft = true;
            }
            // Load in components if sent in stateParams.
            $scope.form.components = $stateParams.components || $scope.form.components;
            if ($stateParams.components) {
              $scope.dirty = true;
            }
            $scope.originalForm = _.cloneDeep($scope.form);
            $scope.formReady = true;
          });
        $scope.revisionsEnabled = true;
      }
      else {
        // Load in components if sent in stateParams.
        $scope.form.components = $stateParams.components || $scope.form.components;
        if ($stateParams.components) {
          $scope.dirty = true;
        }
        $scope.originalForm = _.cloneDeep($scope.form);
        $scope.formReady = true;
      }
    };

    ($scope.loadFormPromise || $q.when()).then(checkDraft);

    $scope.copy = function() {
      $state.go('project.' + $scope.formInfo.type + '.create', {
        components: _.cloneDeep($scope.form.components),
        display: $scope.form.display,
        properties: _.cloneDeep($scope.form.properties),
      });
    };

    // Track any modifications for save/cancel prompt on navigation away from the builder.
    var contentLoaded = false;
    $timeout(function() {
      contentLoaded = true;
    }, 3000);

    $scope.changes = [];

    $scope.$on('formChange', (event, form) => {
      $scope.form.components = form.components;
      $scope.dirty = true;
    });

    $scope.$on('formio.addComponent', (event, component, parent, path, index) => {
      const change = Utils.generateFormChange('add', { component, parent, path, index });
      if (change) {
        $scope.changes.push(change);
      }
    });

    $scope.$on('formio.saveComponent', (event, component, originalComponent) => {
      const change = Utils.generateFormChange('edit', { component, originalComponent });
      if (change) {
        $scope.changes.push(change);
      }
    });

    $scope.$on('formio.deleteComponent', (event, component) => {
      const change = Utils.generateFormChange('remove', { component });
      if (change) {
        $scope.changes.push(change);
      }
    });

    $scope.$on('formio.cancelComponent', (event, component) => {
      const change = Utils.generateFormChange('remove', { component });
      if (change) {
        $scope.changes.push(change);
      }
    });

    var handleFormConflict = function(newForm) {
      var result = Utils.applyFormChanges(newForm, $scope.changes);
      return $scope.parentSave(result.form)
        .then(function() {
          if (result.failed.length) {
            $scope.failed = result.failed;
            ngDialog.open(
              {
                template: 'views/form/form-conflict.html',
                controller: 'FormConflictController',
                showClose: true,
                className: 'ngdialog-theme-default',
                scope: $scope,
              }
            );
          }
        })
        .catch(handleFormConflict);
    };

    // Wrap saveForm in the editor to clear dirty when saved.
    $scope.parentSave = $scope.saveForm;
    $scope.saveForm = function() {
      contentLoaded = false;
      $scope.dirty = false;
      return $scope.parentSave()
        .catch(handleFormConflict)
        .then(function() {
          // Clear changes.
          $scope.changes = [];
        });
    };

    $scope.saveFormDraft = function() {
      angular.element('.has-error').removeClass('has-error');
      $scope.dirty = false;

      // Copy to remove angular $$hashKey
      return Formio.makeStaticRequest($scope.formUrl + '/draft', 'PUT', angular.copy($scope.form), {base: $scope.baseUrl})
        .then(function(response) {
          GoogleAnalytics.sendEvent('FormDraft', 'PUT'.substring(0, 'PUT'.length - 1), null, 1);

          FormioAlerts.addAlert({
            type: 'success',
            message: 'Successfully saved form draft!'
          });

          // Reload page.
          $state.go('project.' + $scope.formInfo.type + '.form.edit', {formId: $scope.form._id}, {reload: true});
        })
        .catch(function(err) {
          if (err) {
            FormioAlerts.onError.call(FormioAlerts, err);
          }

          // FOR-128 - if we're editing a form, make note of the components with issues.
          try {
            var issues = (/Component keys must be unique: (.*)/.exec(_.get(err, 'errors.components.message'))).slice(1);
            if (($state.includes('project.form.form.edit') || $state.includes('project.form.create')) && (issues.length > 0)) {
              issues = (issues.shift()).toString().split(', ');
              issues.forEach(function(issue) {
                angular.element('div.dropzone #' + issue).parent().addClass('has-error');
              });
            }
          }
          catch (e) {}
        });
    };

    /**
     * Util function to show the cancel dialogue.
     *
     * @returns {Promise}
     */
    $scope.showCancelDialogue = function() {
      var dialog = ngDialog.open({
        template: 'views/form/cancel-confirm.html',
        showClose: true,
        className: 'ngdialog-theme-default',
        controller: ['$scope', function($scope) {
          // Reject the cancel action.
          $scope.confirmSave = function() {
            $scope.closeThisDialog('save');
          };

          // Accept the cancel action.
          $scope.confirmCancel = function() {
            $scope.closeThisDialog('close');
          };
        }]
      });

      return dialog.closePromise.then(function(data) {
        if (data.value === 'close') {
          return data;
        }

        throw data.value;
      });
    };

    // Revert to original form and go back
    $scope.cancel = function() {
      return $scope.back('project.' + $scope.formInfo.type + '.form.view', {reload: true});
    };

    // Listen for events to navigate away from the form builder.
    $scope.$on('$stateChangeStart', function(event, transition) {
      // If the form hasnt been modified, skip this cancel modal logic.
      if (!$scope.dirty) {
        return;
      }

      // Stop the transition event and check for the return of $scope.cancel.
      event.preventDefault();

      // Try to cancel the view.
      $scope.showCancelDialogue()
      .then(function() {
        // Cancel without save was clicked, revert the form and get out.
        $scope.form = $scope.$parent.form = angular.copy($scope.originalForm);
        $scope.dirty = false;
        $state.go(transition.name, {notify: false});
      })
      .catch(function(val) {
        // If a value was given, the modal was closed with the x or escape. Take no action and stay on the current page.
        if (!val || (val && val !== 'save')) {
          console.error(val);
          return;
        }

        // If there was no return the cancel action was rejected, save the form before navigation.
        return $scope.saveForm()
        .then(function(result) {
          $scope.dirty = false;
          $state.go(transition.name, {reload: true, notify: false});
        })
        .catch(function(err) {
          console.error(err);
        });
      });
    });
  }
]);

app.controller('FormConflictController', [
  '$scope',
  'ngDialog',
  function($scope, ngDialog) {
    $scope.close = function() {
      ngDialog.close();
    };
  }
]);

app.controller('FormRevisionsController', [
  '$http',
  '$scope',
  function($http, $scope) {
    $scope.loadFormPromise.then(function() {
      $scope.revisionsUrl = $scope.formUrl + '/v';
      $scope.revisionsParams = {
        sort: '-_vid'
      };
    });
  }
]);

app.controller('FormEmbedController', [
  '$scope',
  'ProjectFrameworks',
  function(
    $scope,
    ProjectFrameworks
  ) {
    var setFramework = function(name) {
      if (!$scope.current) {
        $scope.current = {framework: {}};
      }
      var customFramework = {};
      angular.forEach(ProjectFrameworks, function(framework) {
        if (framework.name === name) {
          angular.merge($scope.current.framework, framework);
        }
        if (framework.name === 'custom') {
          customFramework = framework;
        }
      });
      if (!$scope.current) {
        angular.merge($scope.current.framework, customFramework);
      }

      $scope.embedView = 'views/frameworks/' + $scope.current.framework.name + '/embed.html';
    };

    $scope.$watch('primaryProject.framework', function(name) {
      setFramework(name);
    });

    $scope.frameworks = ProjectFrameworks;
  }
]);

app.controller('FormImportController', [
  '$scope',
  '$state',
  '$stateParams',
  'Formio',
  'FormioAlerts',
  function(
    $scope,
    $state,
    $stateParams,
    Formio,
    FormioAlerts
  ) {
    $scope.capitalize = _.capitalize;
    $scope.formType = $stateParams.formType || 'form';

    $scope.importForm = function() {
      (new Formio($scope.embedURL, {base: $scope.baseUrl})).loadForm(null, {noToken: true})
        .then(function(form) {
          $state.go('project.' + form.type + '.create', _.pick(form, ['components', 'display', 'properties']));
        })
        .catch(function(error) {
          FormioAlerts.warn('Error fetching form: ' + _.escape(error));
        });
    };
  }
]);

app.controller('FormShareController', ['$scope', '$rootScope', function($scope, $rootScope) {
  $scope.publicForm = null;
  $scope.previewUrl = '';
  $scope.preview = '';
  $scope.options = {
    theme: '',
    showHeader: true,
    auth: false
  };
  $scope.themes = [
    'Cerulean',
    'Cosmo',
    'Cyborg',
    'Darkly',
    'Flatly',
    'Journal',
    'Lumen',
    'Paper',
    'Readable',
    'Sandstone',
    'Simplex',
    'Slate',
    'Spacelab',
    'Superhero',
    'United',
    'Yeti'
  ];

  // Method to load the preview.
  var loadPreview = function() {
    $scope.previewUrl = $rootScope.onPremise ? $scope.projectUrl + '/manage/view/#/' : 'https://pro.formview.io/#/';
    $scope.previewUrl += $rootScope.onPremise ? 'form/' : $scope.currentProject.name + '/';
    $scope.previewUrl += $scope.currentForm.path + '?';
    $scope.previewUrl += $scope.options.showHeader ? 'header=1' : 'header=0';
    if ($scope.options.theme) {
      $scope.previewUrl += '&theme=' + $scope.options.theme.toLowerCase();
    }
    if ($scope.options.auth) {
      $scope.previewUrl += '&auth=1';
    }
    if ($scope.currentProject._id !== $scope.localProject._id && $scope.localProject.hasOwnProperty('remote')) {
      var parts = $scope.localProject.remote.url.split('://');
      $scope.previewUrl += '&host=' + parts[1] + '&protocol=' + parts[0];
    }
    var formPreview = document.getElementById('form-preview');
    formPreview.innerHTML = '';
    var iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'width: 100%');
    iframe.setAttribute('id', 'share-preview');
    iframe.setAttribute('src', $scope.previewUrl);
    formPreview.appendChild(iframe);
    window.seamless(document.getElementById('share-preview'), {
      spinner: '',
      loading: 'Loading ...'
    });
  };

  // The default role.
  var defaultRole = null;

  // Make a form public.
  $scope.makePublic = function() {
    angular.forEach($scope.form.submissionAccess, function(access, index) {
      if (
        (access.type === 'create_own') &&
        ($scope.form.submissionAccess[index].roles.indexOf(defaultRole._id) === -1)
      ) {
        $scope.form.submissionAccess[index].roles.push(defaultRole._id);
      }
    });
    angular.forEach($scope.form.access, function(access, index) {
      if (
        (access.type === 'read_all') &&
        ($scope.form.access[index].roles.indexOf(defaultRole._id) === -1)
      ) {
        $scope.form.access[index].roles.push(defaultRole._id);
      }
    });

    $scope.publicForm = true;
    $scope.saveForm();
  };

  // Make a form private.
  $scope.makePrivate = function() {
    angular.forEach($scope.form.submissionAccess, function(access, index) {
      if (access.type === 'create_own' || access.type === 'create_all') {
        _.pull($scope.form.submissionAccess[index].roles, defaultRole._id);
      }
    });
    angular.forEach($scope.form.access, function(access, index) {
      if (access.type === 'read_all') {
        _.pull($scope.form.access[index].roles, defaultRole._id);
      }
    });
    $scope.publicForm = false;
    $scope.saveForm();
  };

  $scope.loadProjectPromise.then(function() {
    $scope.loadFormPromise.then(function() {
      $scope.$watch('currentProjectRoles', function(roles) {
        if (!roles) { return; }
        angular.forEach(roles, function(role) {
          if (role.default) {
            defaultRole = role;
          }
        });

        if (defaultRole !== null) {
          $scope.publicForm = false;
          angular.forEach($scope.form.submissionAccess, function(access) {
            if (
              (access.type === 'create_own' || access.type === 'create_all') &&
              (_.indexOf(access.roles, defaultRole._id) !== -1)
            ) {
              $scope.publicForm = true;
            }
          });
        }
      });

      $scope.$watch('options', function() {
        loadPreview();
      }, true);
    });
  });
}]);

app.factory('FormioAlerts', [
  '$rootScope',
  'toastr',
  function (
    $rootScope,
    toastr
  ) {
    return {
      addAlert: function (alert) {
        switch (alert.type) {
          case 'danger':
            toastr.error(alert.message);
            break;
          case 'info':
            toastr.info(alert.message);
            break;
          case 'success':
            toastr.success(alert.message);
            break;
          case 'warning':
            toastr.warning(alert.message);
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
              let message = e.message || e;
              if (e.hasOwnProperty('value')) {
                message += ' (' + e.value + ')';
              }
              this.addAlert({
                type: 'danger',
                message: _.escape(message),
                element: e.path
              });
            }
          }).bind(this));
        }
        else if (error.message) {
          this.addAlert({
            type: 'danger',
            message: _.escape(error.message),
            element: error.path
          });
        }
        else {
          this.addAlert({
            type: 'danger',
            message: _.escape(error)
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
      $scope.back('project.' + $scope.formInfo.type + 'Index');
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

    if (!$scope.numPerPage) {
      $scope.numPerPage = 10;
    }
    $scope.totalItems = 0;
    $scope.currentPage = 1;

    var query = {params: {
      limit: $scope.numPerPage,
      skip: 0
    }};

    var getActions = function() {
      $scope.loadProjectPromise.then(function() {
        $scope.formio.loadActions(query)
          .then(function(actions) {
            $scope.totalItems = actions.serverCount || 0;
            $scope.actions = actions;
          }, FormioAlerts.onError.bind(FormioAlerts))
          .catch(FormioAlerts.onError.bind(FormioAlerts));
        $scope.formio.availableActions().then(function(available) {
          if (!available[0].name) {
            available.shift();
          }
          available.unshift($scope.newAction);
          $scope.availableActions = _.filter(available, function(action) {
            return action.name !== 'sql';
          });
        });
      });
    };

    $scope.setPage = function() {
      query.params.skip = ($scope.currentPage - 1) * query.params.limit;
      getActions();
    };

    getActions();
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
        $scope.actionLoaded = false;
        $scope.actionUrl = $scope.formio.formUrl + '/action';
        if ($stateParams.actionId) {
          $scope.actionUrl += ('/' + $stateParams.actionId);
        }
        $scope.actionInfo = $stateParams.actionInfo || {settingsForm: {}};
        $scope.action = {data: {settings: {}, condition: {}}};

        // Get the action information.
        var getActionInfo = function(name) {
          return $scope.formio.actionInfo(name).then(function(actionInfo) {
            if (!actionInfo) {
              return $scope.actionInfo;
            }
            $scope.actionInfo = _.cloneDeep(actionInfo);
            if ($scope.actionUrl) {
              $scope.actionInfo.settingsForm.action = $scope.actionUrl;
            }
            return $scope.actionInfo;
          });
        };

        /**
         * Load an action into the scope.
         * @param defaults
         */
        var loadAction = function(defaults) {
          if ($stateParams.actionId) {
            var loader = new Formio($scope.actionUrl, {base: $scope.baseUrl});
            return loader.loadAction().then(function(action) {
              $scope.action = _.merge($scope.action, {data: action});
              $scope.actionLoaded = true;
              return getActionInfo(action.name);
            });
          }
          else if (defaults) {
            $scope.action = _.merge($scope.action, {data: defaults});
            $scope.action.data.settings = {};
            $scope.actionLoaded = true;
            return $q.when($scope.actionInfo);
          }
        };

        // Get the action information.
        if (!$stateParams.actionInfo && $stateParams.actionName) {
          return getActionInfo($stateParams.actionName).then(function(info) {
            return loadAction(info.defaults);
          }).catch(function(error) {
            $scope.error = error;
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
  'PDFServer',
  function(
    $scope,
    $stateParams,
    $state,
    $cacheFactory,
    FormioAlerts,
    ActionInfoLoader,
    FormioUtils,
    GoogleAnalytics,
    $timeout,
    PDFServer
  ) {
    // Invalidate cache so actions fetch fresh request for
    // component selection inputs.
    $cacheFactory.get('$http').removeAll();
    $scope.actionLoaded = false;
    $scope.loadProjectPromise.then(function() {
      // Helpful warnings for certain actions
      ActionInfoLoader.load($scope, $stateParams).then(function(actionInfo) {
        // SQL Action missing sql server warning
        if(actionInfo && actionInfo.name === 'sql') {
          var typeComponent = FormioUtils.getComponent(actionInfo.settingsForm.components, 'type');
          if(typeComponent && typeComponent.data && JSON.parse(typeComponent.data.json).length === 0) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any SQL servers configured. You can add a SQL server in your <a href="#/project/'+$scope.currentProject._id+'/env/integrations/data">Stage Settings</a>.');
          }
        }

        // Email action missing transports (other than the default one).
        if(actionInfo && actionInfo.name === 'email') {
          $scope.$watch('action.data.settings.attachPDF', function(attachPDF) {
            if (attachPDF) {
              // Load the PDFServer information.
              PDFServer.getInfo($scope.primaryProjectPromise).then(function(info) {
                if (!info) {
                  return console.warn('Cannot find project information.');
                }
                if (info.data.plan === 'basic') {
                  $timeout(function() {
                    $(document.createElement('div'))
                      .attr('id', 'attach-pdf-alert')
                      .attr('role', 'alert')
                      .addClass('alert alert-warning alert-dismissible')
                      .html(
                        '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                        '<span aria-hidden="true">&times;</span>' +
                        '</button>' +
                        '<strong>Warning:</strong> This project is currently on the <strong>Basic PDF plan</strong> which only allows for <strong>10</strong> submission PDF attachments per month. ' +
                        'Please <a class="btn btn-default" href="/#/project/' + $scope.primaryProject._id + '/billing">Upgrade your PDF Plan</a> to remove this message.'
                      )
                      .insertBefore('#form-group-attachPDF');
                  });
                }
              });
            }
            else {
              $('#attach-pdf-alert').remove();
            }
          });

          var transportComponent = FormioUtils.getComponent(actionInfo.settingsForm.components, 'transport');
          if(transportComponent && transportComponent.data && JSON.parse(transportComponent.data.json).length <= 1) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any email transports configured. You can add an email transport in your <a href="#/project/'+$scope.currentProject._id+'/env/integrations/email">Stage Settings</a>, or you can use the default transport (charges may apply).');
          }
        }

        // Oauth action alert for new resource missing role assignment.
        if (actionInfo && actionInfo.name === 'oauth') {
          var providers = FormioUtils.getComponent(actionInfo.settingsForm.components, 'provider');
          if (providers && providers.data && providers.data.json && providers.data.json === '[]') {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The OAuth Action requires a provider to be configured, before it can be used. You can add an OAuth provider in your <a href="#/project/'+$scope.currentProject._id+'/env/integrations/oauth">Stage Settings</a>.');
          }
        }

        // Google Sheets action alert for missing settings.
        if (actionInfo && actionInfo.name === 'googlesheet') {
          var settings = _.get($scope, 'currentProject.settings.google');
          if (!_.has(settings, 'clientId')) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The Google Sheets Action requires a Client ID to be configured, before it can be used. You can add all Google Data Connection settings in your <a href="#/project/'+$scope.currentProject._id+'/env/integrations/oauth">Stage Settings</a>.');
          }
          if (!_.has(settings, 'cskey')) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The Google Sheets Action requires a Client Secret Key to be configured, before it can be used. You can add all Google Data Connection settings in your <a href="#/project/'+$scope.currentProject._id+'/env/integrations/oauth">Stage Settings</a>.');
          }
          if (!_.has(settings, 'refreshtoken')) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The Google Sheets Action requires a Refresh Token to be configured, before it can be used. You can add all Google Data Connection settings in your <a href="#/project/'+$scope.currentProject._id+'/env/integrations/oauth">Stage Settings</a>.');
          }
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
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You have not yet configured your Hubspot API key. You can configure your Hubspot API key in your <a href="#/project/'+$scope.currentProject._id+'/env/integrations/hubspot">Stage Settings</a>.');
            $scope.formDisabled = true;
          }
          FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
            if (!component.key) {
              return;
            }

            var result = component.key.match(/(.*)_action/);
            if (result) {
              $timeout(function() {
                showFields(result[1], $scope.action.data.settings[result[0]]);
              });
              $scope.$watch('action.data.settings.' + result[0], function(current) {
                showFields(result[1], current);
              });
            }
          });
        }

        if(actionInfo && actionInfo.name === 'oauth') {
          // Show warning if button component has no options
          var buttonComponent = FormioUtils.getComponent(actionInfo.settingsForm.components, 'settings.button');
          if(JSON.parse(buttonComponent.data.json).length === 0) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any Button components with the `oauth` action on this form, which is required to use this action. You can add a Button component on the <a href="#/project/'+$scope.projectId+'/form/'+$scope.formId+'/edit">form edit page</a>.');
          }
        }

        // Check for, and warn about premium actions being present.
        if(
          actionInfo &&
          actionInfo.hasOwnProperty('premium') &&
          actionInfo.premium === true &&
          $scope.primaryProject &&
          $scope.primaryProject.hasOwnProperty('plan') &&
          ['basic', 'trial', 'independent'].indexOf($scope.primaryProject.plan) !== -1
        ) {
          $scope.formDisabled = ['basic', 'independent'].includes($scope.primaryProject.plan);
          $scope.premiumNotAvailable = true;
          $scope.premiumWarning = $scope.formDisabled ?
            '<i class="glyphicon glyphicon-exclamation-sign"></i> This is a Premium Action, please upgrade your <a ui-sref="project.billing({projectId: $scope.primaryProject._id)">project plan</a> to enable it.' :
            '<i class="glyphicon glyphicon-exclamation-sign"></i> This is a Premium Action. This action will not work after your trial period. Upgrade your project <a ui-sref="project.billing({projectId: $scope.primaryProject._id)">project plan</a> to make it permanent.';
          FormioAlerts.warn($scope.premiumWarning);
        }

        var component = FormioUtils.getComponent($scope.form.components, _.get($scope, 'action.data.condition.field'));
        var field = _.get($scope, 'action.data.condition.field');
        if (!component && (field !== undefined && field !== '')) {
          // Add an alert to the window
          FormioAlerts.addAlert({
            type: 'danger',
            message: '<i class="glyphicon glyphicon-exclamation-sign"></i> This Action will not execute because the conditional settings are invalid. Please fix them before proceeding.'
          });

          // Try to highlight the issue in the dom.
          try {
            $timeout(function() {
              var element = angular.element('#field .ui-select-match span.btn-default.form-control');
              element.css('border-color', 'red').on('blur', function() {
                element.css('border-color', '');
              });
            });
          }
          catch (e) {
            // do nothing if we cant find the input field.
          }
        }
      });
    });

    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      Formio.cache = {};
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
  '$stateParams',
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
  '$interpolate',
  'SubmissionExport',
  function(
    $scope,
    $state,
    $stateParams,
    $http,
    $timeout,
    $window,
    $q,
    Formio,
    FormioUtils,
    FormioAlerts,
    formioComponents,
    GoogleAnalytics,
    ngDialog,
    $interpolate,
    SubmissionExport
  ) {
    if ($stateParams._vid) {
      $scope._vid = $stateParams._vid;
    }
    // Returns true if component should appear in table
    $scope.tableView = function(component) {
      return !component.protected &&
        (!component.hasOwnProperty('persistent') || component.persistent) &&
        (component.tableView);
    };

    // Refresh the grid when the timezones are done loading.
    document.body.addEventListener('zonesLoaded', function() {
      if ($scope.grid) {
        $scope.grid.refresh();
      }
    });

    $scope.export = function(form, type) {
      $scope.isBusy = true;
      SubmissionExport.export($scope.formio, form, type)
        .then(function() {
          $scope.isBusy = false;
        })
        .catch(function(err) {
          $scope.isBusy = false;
          console.warn(err);
          FormioAlerts.onError(err);
        });
    };

    // Creates resourcejs sort query from kendo datasource read options
    var getSortQuery = function(options) {
      return _.map(options, function(opt) {
        // FOR-395 - Remove the fix applied in FOR-323 to fix issues with the filter query being escaped.
        return (opt.dir === 'desc' ? '-' : '') + opt.field.replace(/^\["|"\]$/gi, '');
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

    var getKendoCell = function(component, path) {
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

      var field = path ? '["data.' + path + '.' + component.key.replace(/\./g, '.data.') + '"]' : '["data.' + component.key.replace(/\./g, '.data.') + '"]';
      return {
        field: field,
        title: _.escape(component.label) || component.key,
        template: function(dataItem) {
          var val = dataItem.data;
          if (path && _.has(val, path)) {
            val = _.get(val, path);
          }

          var value = FormioUtils.fieldData(val.toJSON(), component);
          if (!value && ['container', 'datagrid', 'editgrid', 'well', 'panel', 'columns', 'fieldset', 'table'].indexOf(component.type) !== -1) {
            value = val.toJSON();
          }

          if (!value && component.type === 'form') {
            let componentInfo = formioComponents.components[component.type] || formioComponents.components.custom;

            value = componentInfo.tableView(val.toJSON()[component.key], {
              component: component,
              $interpolate: $interpolate,
              componentInfo: formioComponents,
              util: FormioUtils
            });
          }

          var submissionTimezone = '';
          if (dataItem && dataItem.metadata && dataItem.metadata.timezone) {
            submissionTimezone = dataItem.metadata.timezone;
          }
          var componentInfo = formioComponents.components[component.type] || formioComponents.components.custom;
          if (!componentInfo || !componentInfo.tableView) {
            if (value === undefined) {
              return '';
            }
            if (component.multiple) {
              return DOMPurify.sanitize(value.join(', '));
            }
            return DOMPurify.sanitize(value);
          }
          if (component.multiple && (value.length > 0)) {
            var values = [];
            angular.forEach(value, function(arrayValue) {
              arrayValue = componentInfo.tableView(arrayValue, {
                component: component,
                options: {
                  submissionTimezone: submissionTimezone
                },
                $interpolate: $interpolate,
                componentInfo: formioComponents,
                util: FormioUtils
              });
              if (arrayValue === undefined) {
                return values.push('');
              }
              values.push(arrayValue);
            });
            return DOMPurify.sanitize(values.join(', '));
          }
          value = componentInfo.tableView(value, {
            component: component,
            options: {
              submissionTimezone: submissionTimezone
            },
            $interpolate: $interpolate,
            componentInfo: formioComponents,
            util: FormioUtils
          });
          if (value === undefined) {
            return '';
          }
          return DOMPurify.sanitize(value);
        },
        // Disabling sorting on embedded fields because it doesn't work in resourcejs yet
        width: '200px',
        filterable: filterable
      };
    };

    // When form is loaded, create the columns
    $scope.loadFormPromise.then(function(form) {
      var currentForm = _.clone(form) || {};
      var loadRevisionsPromise = new Promise(function(resolve, reject) {
        if (form && form.revisions === 'original' && !isNaN(parseInt($stateParams._vid))) {
          (new Formio($scope.formUrl + '/v/' + $stateParams._vid)).loadForm()
            .then(function(revisionForm) {
              currentForm.components = revisionForm.components;
              return resolve();
            });
        }
        else {
          return resolve();
        }
      });
      loadRevisionsPromise.then(function() {
        // Load the grid on the next digest.
        $timeout(function() {
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
                fields: _(FormioUtils.flattenComponents(currentForm.components))
                  .filter(function(component, path) {
                    // Don't include fields that are nested.
                    return path.indexOf('.') === -1;
                  })
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

                    // FOR-323 - Escape data to fix keys with - in them, because they are not valid js identifiers.
                    return ['["data.' + component.key.replace(/\./g, '.data.') + '"]', {type: type}];
                  })
                  .concat([
                    ['created', {type: 'date'}],
                    ['modified', {type: 'date'}]
                  ])
                  .fromPairs()
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
                  limit: options.data.take || dataSource.total(),
                  skip: options.data.skip,
                  sort: getSortQuery(options.data.sort)
                };
                // Filter by _vid if provided.
                if (!isNaN(parseInt($stateParams._vid))) {
                  params._fvid = $stateParams._vid;
                }
                _.each(filters, function(filter) {
                  // FOR-395 - Fix query regression with FOR-323
                  filter.field = filter.field.replace(/^\["|"\]$/gi, '');

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
                    console.warn(err);
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
                    console.warn(err);
                    FormioAlerts.onError(err);
                    options.error(err);
                  }));
              }
            }
          });

          // Track component keys inside objects, so they dont appear in the grid more than once.
          var componentHistory = [];

          // Generate columns
          var columns = [];
          FormioUtils.eachComponent(currentForm.components, function(component, componentPath) {
            if (component.tableView === false || !component.key || !component.type) {
              return;
            }
            // FOR-310 - If this component was already added to the grid, dont add it again.
            if (component.key && componentHistory.indexOf(component.key) !== -1) {
              return;
            }

            if (['container', 'datagrid', 'editgrid', 'well', 'fieldset', 'panel'].indexOf(component.type) !== -1) {
              FormioUtils.eachComponent(component.components, function(component) {
                if (component.key) {
                  componentHistory.push(component.key);
                }
              }, true);
            }
            else if (['columns'].indexOf(component.type) !== -1) {
              component.columns.forEach(function(column) {
                FormioUtils.eachComponent(column.components, function(component) {
                  if (component.key) {
                    componentHistory.push(component.key);
                  }
                }, true);
              });
            }
            else if (['table'].indexOf(component.type) !== -1) {
              component.rows.forEach(function(row) {
                row.forEach(function(col) {
                  FormioUtils.eachComponent(col.components, function(component) {
                    if (component.key) {
                      componentHistory.push(component.key);
                    }
                  }, true);
                });
              });
            }

            columns.push(getKendoCell(component));
          }, true);

          if (currentForm.revisions) {
            columns.push({
              field: '_fvid',
              title: 'Form Version',
              width: '100px',
            });
          }

          columns.push(
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
          );

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
    });
  }
]);

app.controller('FormSubmissionController', [
  '$scope',
  '$state',
  '$stateParams',
  'Formio',
  'PDFServer',
  function(
    $scope,
    $state,
    $stateParams,
    Formio,
    PDFServer
  ) {
    $scope.primaryProjectPromise.then(function(primaryProject) {
      $scope.loadProjectPromise.then(function(project) {
        $scope.submissionReady = false;
        $scope.submissionId = $stateParams.subId;
        $scope.submissionUrl = $scope.formUrl;
        $scope.submissionUrl += $stateParams.subId ? ('/submission/' + $stateParams.subId) : '';
        $scope.submissionData = Formio.submissionData;
        $scope.submission = {};
        $scope.downloadUrl = '';
        $scope.pdfImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAAD6CAMAAAC/MqoPAAAAA3NCSVQICAjb4U/gAAAC9FBMVEX///+HiYuGhomCg4aCgIF6eX12eHokJCQkICAgICAjHSOOj5KJi46DhYd1dnltb3EkICAgICAjHSOVl5qTlZeOj5KHiYt6eX0kICAjHSOZmp2Vl5qGhokkICDOz9G+vsCztbapq66cnqGbnZ6ZmZmTlZckICCbnZ6Zmp2Vl5qTlZeOj5KMioqGhomCg4aCgIGZmp2TlZeCgIGmqauho6aen6KcnqGmqaucnqGbnZ66u76cnqGZmp2Vl5rKISjS0dLR0NHOz9HMzMzHycrHxsfFxMXCwsPCw8W+vsCen6KbnZ7GISjCwsO+v8K+vsCpq66kpqmeoaObnZ7////7+/v5+vr39/j09fXz8/P88PHx8fL37+/u7+/r7O3r6+zp6uvn5+jj5+fz4+P44eLw4eHj5OXi4+Th4uPf4OLf3+Dc3t/b3N7a29z109TY2tvv1NXv0tPX2NrW19jU1tfS09XP0dLOz9Hrx8jxxMbnxsfMzMzkxMXHycrGx8nDxcfqubvCw8XCwsPkuLrutbe/wcO+v8Lftre+vsC7vb+6u763ubu1t7riqqzeqquztbbqpqmxs7bZqKmvsbOtr7Kqra+pq67bnJ7gm56mqavXnJ3nl5ulp6qkpqmjpaeho6aeoaPbj5Gen6KcnqHXjpGbnZ7jiYzfio7SjpDdiYyZmp3LjI6ZmZnahoqVl5rXgoaTlZeSk5bSgIOPkZPOf4Lgen6Oj5LLf4KLjY+Ji46HiYvVcnaGhonNcnWDhYfKcXSCg4bca3DFcXTBcHJ+gIJ9foHRZWl6fH7MZmbOZWnGZGd6eX12eHrBY2bZXGF1dnlydHa4YWNwcXTOV1vKVlvIVlrCVlnPUFW+VVnOTlS3VFe1VFbKS1HGSE3BR0y/R0y7R0zEREq2R0rSP0WzRkmtRUjBOkC4OT6zOD3OMDaqNzrBLTO2KzCzKzCuKi/KISiqKi6lKS2+ICa6HyW7Hya2HySuHiOyHiSrHiKnHSGiHCCeHB+aGx/MBOLyAAAA/HRSTlMAERERERERERERESIiIiIiIiIiMzMzMzMzM0RERERVVVVVVVVVVVVmZmZmZmZmZmZ3d3eIiIiImZmZqqqqqrvMzMzMzMzMzMzMzMzM3d3d3e7u7v////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8PeNL3AAAACXBIWXMAAC37AAAt+wH8h0rnAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAFydJREFUeJzt3Xl8FNd9AHD31K56LfSIaOumTY80aeK06R23TXq5xXV8ZIRhzWEkgkAHKICQZCwpQpZsSSsWRQdeR2hlCWEsXFkHyELmtMEkGBvnMKZ2iV1jW2COGAOSwPzT33tv5s2bY3fn+O2slg8//DFikeT97u94b2Zn5FtuuRk342bcjJtxM8zCl5nhaWRm+lJNJuHP8Psy/H6/z7uA/1oG/CvVfL+P/vJS7qP/uQx4wVOJh9f/93q6u6LRzs0dHZH29ra21taWluZwOBRqbGxsqK+vr6urra2trq6qqqqsrKyoqFhHo5TEWiFKtKE8TD6NfgF8ZUUlfJNq+G519Q2NoVA4/Lek2lJI931algO8HeCqvKGBwOsIvFqBV+jhJXHCFF+9Huj1hN7Scs/vQvZTJ/f9Ppe3mcjVlGsyrsv1mpI1mtDo6QtVyvHV1WBvDIWbW1pb2//G58tMjRwaLvAHXE7hIA9RuVzscsqNGedsHquFf6t+rqd2kndOb2ttn/2p1OQ9w58ZCHxWlbeYyUnKNXAh4cxqEuwFMLVXVpFmh3pvbYP/Zvu9n/Olot+h3AOBzwtyqHXtgNOmXN/ignuVJmQ/56s9D98J0v5YQ2O4pa090gH2jtt/LQV2WNUCgT8Tqp3KhT7n802bcrXSGXqlPrif4tfwzFM7tHsdo3ds7oR+75j9W97LM3wzA1lfUOXNOvn6anFJ0zY5r3UTucznuVfLXrbXQrO3tEU6o13RFrDf9zmv6Zl+fyCQ9cWIblGLKdc2uVLnDFoEUUj/YcH0K9XUq3hS8nUNlN7V0xMh9ujtHtMzCH3WbcqEExY1bbWLcqHS1XxTbKE2OF/Wi3aa9ua2SLS7t6+vmdpn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';

        // Load the form and submissions.
        $scope.formio = new Formio($scope.submissionUrl, {
          base: $scope.baseUrl,
          project: $scope.projectUrl
        });

        $scope.loadFormPromise.then(function(form) {
          // Ensure our project in the PDF server.
          PDFServer.ensureProject($scope.primaryProjectPromise).then(function() {
            $scope.formio.getDownloadUrl(form).then(function (url) {
              if (primaryProject._id !== project._id) {
                url += '&project=' + primaryProject._id;
              }
              $scope.downloadUrl = url;
            });
          });

          $scope.formio.loadSubmission().then(function(submission) {
            $scope.submission = submission;
            $scope.submissionReady = true;
          });
        });
      });
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

app.controller('FormPermissionController', [
  '$scope',
  'FormioAlerts',
  function(
    $scope,
    FormioAlerts
  ) {
    const saveForm = function() {
      $scope.formio.saveForm(angular.copy($scope.form)).then(function(form) {
        $scope.$emit('updateFormPermissions', form);
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Permissions Saved'
        });
      }).catch(function(err) {
        FormioAlerts.addAlert({
          type: 'danger',
          message: err.message
        });
      });
    };

    $scope.groupSelfAccess = '';
    $scope.setGroupSelfAccess = function(target) {
      const groupPerm = _.find($scope.form.submissionAccess, {type: 'group'});
      if (groupPerm) {
        groupPerm.permission = target.groupSelfAccess;
      }
      else {
        if (!$scope.form.submissionAccess) {
          $scope.form.submissionAccess = [];
        }
        $scope.form.submissionAccess.push({
          type: 'group',
          permission: target.groupSelfAccess
        });
      }
      saveForm();
    };

    $scope.loadFormPromise.then(function(form) {
      const groupPerm = _.find(form.submissionAccess, {type: 'group'});
      if (groupPerm) {
        $scope.groupSelfAccess = groupPerm.permission;
      }
    });

    $scope.$on('permissionsChange', () => saveForm());
  }
]);

app.constant('SubmissionAccessLabels', {
  'create_own': {
    label: 'Create Own Submissions',
    tooltip: 'The Create Own Submissions permission will allow a user with one of the Roles to create a Submission. Upon creating the Submission, the user will be defined as its owner.'
  },
  'create_all': {
    label: 'Create All Submissions',
    tooltip: 'The Create All Submissions permission will allow a user with one of the Roles to create a new Submission and assign ownership of that Submission to another user.',
    elevated: true
  },
  'read_own': {
    label: 'Read Own Submissions',
    tooltip: 'The Read Own Submissions permission will allow a user with one of the Roles to read a Submission. A user can only read a Submission if they are defined as its owner.'
  },
  'read_all': {
    label: 'Read All Submissions',
    tooltip: 'The Read All Submissions permission will allow a user with one of the Roles to read all Submissions regardless of who owns them.',
    elevated: true
  },
  'update_own': {
    label: 'Update Own Submissions',
    tooltip: 'The Update Own Submissions permission will allow a user with one of the Roles to update a Submission. A user can only update a Submission if they are defined as its owner.'
  },
  'update_all': {
    label: 'Update All Submissions',
    tooltip: 'The Update All Submissions permission will allow a user with one of the Roles to update a Submission, regardless of who owns the Submission. Additionally with this permission, a user can change the owner of a Submission.',
    elevated: true
  },
  'delete_own': {
    label: 'Delete Own Submissions',
    tooltip: 'The Delete Own Submissions permission will allow a user with one of the Roles, to delete a Submission. A user can only delete a Submission if they are defined as its owner.'
  },
  'delete_all': {
    label: 'Delete All Submissions',
    tooltip: 'The Delete All Submissions permission will allow a user with one of the Roles to delete a Submission, regardless of who owns the Submission.',
    elevated: true
  }
});

app.constant('ResourceAccessLabels', {
  'read': {
    label: 'Read',
    tooltip: 'The Read permission will allow a resource, defined in the submission, to read all of the submission data.'
  },
  'write': {
    label: 'Write',
    tooltip: 'The Write permission will allow a resource, defined in the submission, to read all of the submission data and edit all of the data except for the Submission Resource Access and Owner information.'
  },
  'admin': {
    label: 'Admin',
    tooltip: 'The Admin permission will allow a resource, defined in the submission, to read and edit all of the submission data.'
  }
});

app.constant('AccessLabels', {
  'read_all': {
    label: 'Read Form Definition',
    tooltip: 'The Read permission will allow a user, with one of the given Roles, to read the form.',
    elevated: true
  },
  'update_all': {
    label: 'Update Form Definition',
    tooltip: 'The Update permission will allow a user, with one of the given Roles, to read and edit the form.',
    elevated: true
  },
  'delete_all': {
    label: 'Delete Form Definition',
    tooltip: 'The Delete permission will allow a user, with one of the given Roles, to delete the form.',
    elevated: true
  },
  'read_own': {
    label: 'Read Form Definition (Restricted to owner)',
    tooltip: 'The Read Own permission will allow a user, with one of the given Roles, to read a form. A user can only read a form if they are defined as its owner.'
  },
  'update_own': {
    label: 'Update Form Definition (Restricted to owner)',
    tooltip: 'The Update Own permission will allow a user, with one of the given Roles, to update a form. A user can only update a form if they are defined as its owner.'
  },
  'delete_own': {
    label: 'Delete Form Definition (Restricted to owner)',
    tooltip: 'The Delete Own permission will allow a user, with one of the given Roles, to delete a form. A user can only delete a form if they are defined as its owner.'
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
    $scope.currentSection.title = 'API Explorer';
    $scope.currentSection.icon = 'fa fa-code';
    $scope.currentSection.help = '';
    $scope.token = Formio.getToken();
  }
]);
