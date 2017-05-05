'use strict';

/* globals chance, location */

angular.module('formioApp.controllers.pdf', ['ngDialog'])
  .factory('PDFServer', [
    '$http',
    'Formio',
    '$q',
    'AppConfig',
    function(
      $http,
      Formio,
      $q,
      AppConfig
    ) {
      var infoCache = {};
      var infoReady = $q.defer();
      var infoPromise = null;
      return {
        ensureFileToken: function(project) {
          if (project.settings.filetoken) {
            return $q.resolve(project);
          }

          // Create a key and save the project.
          project.settings.filetoken = chance.string({
            length: 30,
            pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          });
          return (new Formio('/project/' + project._id)).saveProject(project);
        },
        ensureProject: function(projectPromise, cb) {
          return projectPromise.then(this.ensureFileToken.bind(this));
        },
        pdfUrl: function(project) {
          return AppConfig.pdfServer + '/pdf/' + project._id;
        },
        getInfo: function(projectPromise) {
          return this.ensureProject(projectPromise).then(function(project) {
            if (infoCache.hasOwnProperty(project._id)) {
              return $q.resolve(infoCache[project._id]);
            }
            if (infoPromise) {
              return infoPromise;
            }
            infoPromise = infoReady.promise;
            return $http.get(this.pdfUrl(project), {
              headers: {
                'x-file-token': project.settings.filetoken,
                'x-host': location.hostname
              }
            }).then(function(results) {
              infoCache[project._id] = results.data;
              infoReady.resolve(results.data);
              return results.data;
            });
          }.bind(this));
        },
        purchasePDF: function(projectPromise, purchase) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              if (!info) {
                throw {data: 'Cannot find project information.'};
              }
              if (info.data.host !== location.hostname) {
                throw {data: 'Cannot modify pdfs under different host names.'};
              }
              infoCache[project._id] = null;
              delete infoCache[project._id];
              return $http.post(this.pdfUrl(project) + '/purchase', purchase, {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              });
            }.bind(this));
          }.bind(this));
        },
        deletePDF: function(projectPromise, pdf) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              if (!info) {
                throw {data: 'Cannot find project information.'};
              }
              if (info.data.host !== location.hostname) {
                throw {data: 'Cannot modify pdfs under different host names.'};
              }
              infoCache[project._id] = null;
              delete infoCache[project._id];
              return $http.delete(this.pdfUrl(project) + '/file/' + pdf.data.id, {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              });
            }.bind(this));
          }.bind(this));
        },
        getPDFs: function(projectPromise) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              if (!info) {
                throw {data: 'Cannot find project information.'};
              }
              return $http.get(this.pdfUrl(project) + '/file', {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              }).then(function(results) {
                return results.data;
              });
            }.bind(this));
          }.bind(this));
        }
      };
    }
  ])
  .controller('PDFController', [
    '$scope',
    '$stateParams',
    'AppConfig',
    '$http',
    'ngDialog',
    'FormioAlerts',
    'PDFServer',
    function(
      $scope,
      $stateParams,
      AppConfig,
      $http,
      ngDialog,
      FormioAlerts,
      PDFServer
    ) {
      $scope.availablePDFs = [];
      $scope.numForms = '1,000';
      $scope.numSubmissions = '10,000';
      $scope.totalPrice = 100;
      $scope.currentPlan = 'hosted';

      $scope.onPlanChange = function(plan) {
        $scope.currentPlan = plan || this.currentPlan;
        if (this.currentPlan === 'basic') {
          $scope.numForms = '1';
          $scope.numSubmissions = '10';
          $scope.totalPrice = 0;
        }
        else if (this.currentPlan === 'hosted') {
          $scope.numForms = '1,000';
          $scope.numSubmissions = '10,000';
          $scope.totalPrice = 100;
        }
        else {
          $scope.numForms = 'Unlimited';
          $scope.numSubmissions = 'Unlimited';
          $scope.totalPrice = 250;
        }
      };

      $scope.getPlan = function() {
        if ($scope.currentPlan === 'hosted') {
          return 'Hosted';
        }
        else {
          return 'Enterprise: On-Premise or Private Cloud';
        }
      };

      $scope.forms = {};
      $scope.buyError = '';
      $scope.getPDFUrl = function(pdf) {
        return AppConfig.pdfServer + pdf.data.path + '.html';
      };

      $scope.getAvailable = function(type) {
        if ($scope.pdfInfo.data.plan === 'enterprise') {
          return 'Unlimited';
        }
        var allowedForms = 1;
        var allowedSubmissions = 10;
        if ($scope.pdfInfo.data.plan === 'hosted') {
          allowedForms = 1000;
          allowedSubmissions = 10000;
        }
        if (type === 'forms') {
          var forms = parseInt($scope.pdfInfo.data.forms, 10);
          return (allowedForms - forms);
        }
        else {
          var submissions = parseInt($scope.pdfInfo.data.submissions, 10);
          return (allowedSubmissions - submissions);
        }
      };

      $scope.askToBuy = function() {
        $scope.purchaseAsk = true;
      };

      $scope.cancel = function() {
        ngDialog.close();
      };

      $scope.makePurchase = function() {
        $scope.buyError = '';
        PDFServer.purchasePDF($scope.loadProjectPromise, {
          plan: $scope.currentPlan
        }).then(function(results) {
          $scope.pdfInfo.data = results.data.data;
          $scope.buyComplete = true;
          if ($scope.currentPlan === 'basic') {
            $scope.onPlanChange('hosted');
          }
          else if ($scope.currentPlan === 'hosted') {
            $scope.onPlanChange('enterprise');
          }
          else if ($scope.currentPlan === 'enterprise') {
            $scope.onPlanChange('hosted');
          }
        }, function(err) {
          $scope.buyError = err.data || err.message;
          FormioAlerts.onError({message: $scope.buyError});
        }).catch(function(err) {
          $scope.buyError = err.data || err.message;
          FormioAlerts.onError({message: $scope.buyError});
        });
      };

      $scope.purchase = function(type) {
        $scope.buyComplete = false;
        $scope.purchaseAsk = false;
        ngDialog.open({
          template: 'views/project/env/pdf/purchase.html',
          scope: $scope
        });
      };

      $scope.getPDFs = function() {
        PDFServer.getPDFs($scope.loadProjectPromise).then(function(pdfs) {
          $scope.availablePDFs = pdfs;
        });
      };

      $scope.confirmDelete = function() {
        PDFServer.deletePDF($scope.loadProjectPromise, $scope.currentPDF).then(function() {
          $scope.pdfInfo.data.active = (parseInt($scope.pdfInfo.data.active, 10) - 1).toString();
          $scope.cancel();
          $scope.getPDFs();
        }, function(err) {
          FormioAlerts.onError({message: err.data});
          $scope.cancel();
        }).catch(function(err) {
          FormioAlerts.onError({message: err.data});
          $scope.cancel();
        });
      };

      $scope.deletePDF = function(pdf) {
        $scope.currentPDF = pdf;
        ngDialog.open({
          template: 'views/project/env/pdf/delete.html',
          scope: $scope
        });
      };

      $scope.pdfInfo = {};
      PDFServer.getInfo($scope.loadProjectPromise).then(function(info) {
        if (!info) {
          throw {data: 'Cannot find project information.'};
        }
        $scope.pdfInfo = info;
        if (info.data.plan === 'hosted') {
          $scope.onPlanChange('enterprise');
        }
      });

      // Get all of the forms that have a pdf attached to them.
      $http.get(AppConfig.apiBase + '/project/' + $stateParams.projectId + '/form', {
        params: {
          'settings.pdf.id__exists': 1,
          'select': 'settings.pdf.id,title,type',
          'limit': '100'
        }
      }).then(function(results) {
        angular.forEach(results.data, function(form) {
          if (!$scope.forms[form.settings.pdf.id]) {
            $scope.forms[form.settings.pdf.id] = [];
          }
          $scope.forms[form.settings.pdf.id].push(form);
        });
      });

      $scope.getPDFs();
    }
  ]);
