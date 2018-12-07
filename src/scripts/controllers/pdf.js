'use strict';
import chance from 'chance';

/* globals location */

angular.module('formioApp.controllers.pdf', ['ngDialog'])
  .factory('PDFServer', [
    '$http',
    'Formio',
    '$q',
    'AppConfig',
    'FormioAlerts',
    function(
      $http,
      Formio,
      $q,
      AppConfig,
      FormioAlerts
    ) {
      var infoCache = {};
      var infoReady = $q.defer();
      var infoPromise = null;
      var primaryPromise = null;
      var PDFServer = {
        setPrimaryProject: function(primary) {
          primaryPromise = primary;
        },
        setFileToken: function(project) {
          if (!project.settings) {
            project.settings = {};
          }

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
        ensureFileToken: function(project) {
          // First load the primary project.
          return primaryPromise.then(function(primary) {
            // If this is the primary, then ensure the token.
            if (project._id === primary._id) {
              return PDFServer.setFileToken(project);
            }

            // Otherwise, make sure that we set this project token to the same as the primary.
            return PDFServer.ensureFileToken(primary).then(function() {
              if (!project.settings) {
                project.settings = {};
              }
              project.settings.filetoken = primary.settings.filetoken;
              return (new Formio('/project/' + project._id)).saveProject(project);
            });
          });
        },
        ensureProject: function(projectPromise, cb) {
          return projectPromise.then(this.ensureFileToken.bind(this));
        },
        pdfServer: function(project, remote) {
          var pdfServer = AppConfig.pdfServer;
          if (remote && project.settings.pdfserver) {
            pdfServer = project.settings.pdfserver;
          }
          return pdfServer;
        },
        pdfUrl: function(project, remote) {
          return this.pdfServer(project, remote) + '/pdf/' + project._id;
        },
        clearCache: function() {
          infoCache = {};
          infoReady = $q.defer();
          infoPromise = null;
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
            var pdfProjectUrl = this.pdfUrl(project);
            return $http.get(pdfProjectUrl, {
              headers: {
                'x-file-token': project.settings.filetoken,
                'x-host': location.hostname
              }
            }).then(function(results) {
              infoCache[project._id] = results.data;
              infoReady.resolve(results.data);
              return results.data;
            }, function(err) {
              FormioAlerts.onError('Unable to fetch PDF project information. ' + pdfProjectUrl);
            });
          }.bind(this));
        },
        purchasePDF: function(projectPromise, purchase) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              if (!info) {
                throw {data: 'Cannot find project information.'};
              }
              infoCache[project._id] = null;
              delete infoCache[project._id];
              return $http.post(this.pdfUrl(project) + '/purchase', purchase, {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              }, function(err) {
                FormioAlerts.onError('Unable to make purchase. Please contact support.');
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
              infoCache[project._id] = null;
              delete infoCache[project._id];
              var pdfFile = this.pdfUrl(project, true) + '/file/' + pdf.data.id;
              return $http.delete(pdfFile, {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              }, function(err) {
                FormioAlerts.onError('Unable to delete PDF ' + pdfFile);
              });
            }.bind(this));
          }.bind(this));
        },
        getAllowed: function(projectPromise) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              var numForms = parseInt(info.data.forms, 10);
              var numSubs = parseInt(info.data.submissions, 10);
              var allowed = {
                forms: 1,
                submissions: 10
              };

              if (project.plan === 'enterprise') {
                allowed.forms = AppConfig.pdfHostedForms;
                allowed.submissions = AppConfig.pdfHostedSubs;
              }

              if (info.data.plan === 'hosted') {
                allowed.forms = AppConfig.pdfHostedForms;
                allowed.submissions = AppConfig.pdfHostedSubs;
                if (project.plan === 'enterprise') {
                  allowed.forms *= 2;
                  allowed.submissions *= 2;
                }
              }

              allowed.availableForms = (info.data.plan === 'enterprise') ? 1000000 : (allowed.forms - numForms);
              allowed.availableSubs = (info.data.plan === 'enterprise') ? 1000000 : (allowed.submissions - numSubs);
              return allowed;
            }.bind(this));
          }.bind(this));
        },
        getPDFs: function(projectPromise) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              if (!info) {
                throw {data: 'Cannot find project information.'};
              }
              var pdfsUrl = this.pdfUrl(project, true) + '/file';
              return $http.get(pdfsUrl, {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              }).then(function(results) {
                return results.data;
              }, function(err) {
                FormioAlerts.onError('Unable to fetch pdfs at ' + pdfsUrl);
              });
            }.bind(this));
          }.bind(this));
        }
      };
      return PDFServer;
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
      PDFServer.clearCache();
      $scope.availablePDFs = [];
      $scope.numForms = AppConfig.pdfHostedForms.toLocaleString();
      $scope.numSubmissions = AppConfig.pdfHostedSubs.toLocaleString();
      $scope.totalPrice = AppConfig.pdfHostedPrice;
      $scope.currentPlan = 'hosted';
      $scope.currentTab = 'pdf';
      $scope.loading = true;

      $scope.setTab = function(tab) {
        $scope.currentTab = tab;
      };

      $scope.onPlanChange = function(plan) {
        $scope.currentPlan = plan || this.currentPlan;
        if (this.currentPlan === 'basic') {
          $scope.numForms = '1';
          $scope.numSubmissions = '10';
          $scope.totalPrice = 0;
        }
        else if (this.currentPlan === 'hosted') {
          $scope.numForms = AppConfig.pdfHostedForms.toLocaleString();
          $scope.numSubmissions = AppConfig.pdfHostedSubs.toLocaleString();
          $scope.totalPrice = AppConfig.pdfHostedPrice;
        }
        else {
          $scope.numForms = 'Unlimited';
          $scope.numSubmissions = 'Unlimited';
          $scope.totalPrice = AppConfig.pdfEnterprisePrice;
        }
        $scope.getAvailable();
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
        var pdfServer = AppConfig.pdfServer;
        if ($scope.primaryProject.settings.pdfserver) {
          pdfServer = $scope.primaryProject.settings.pdfserver;
        }
        return pdfServer + pdf.data.path + '.html';
      };

      $scope.availableForms = 0;
      $scope.availableSubs = 0;
      $scope.getAvailable = function() {
        return PDFServer.getAllowed($scope.primaryProjectPromise).then(function(allowed) {
          $scope.availableForms = (allowed.availableForms === 1000000) ? 'Unlimited' : allowed.availableForms.toLocaleString();
          $scope.availableSubs = (allowed.availableSubs === 1000000) ? 'Unlimited' : allowed.availableSubs.toLocaleString();
        });
      };

      $scope.askToBuy = function() {
        $scope.purchaseAsk = true;
      };

      $scope.cancel = function() {
        ngDialog.close();
      };

      $scope.makePurchase = function() {
        $scope.buyError = '';
        PDFServer.purchasePDF($scope.primaryProjectPromise, {
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
        $scope.getAvailable();
        PDFServer.getPDFs($scope.primaryProjectPromise).then(function(pdfs) {
          $scope.availablePDFs = pdfs;
        });
      };

      $scope.confirmDelete = function() {
        PDFServer.deletePDF($scope.primaryProjectPromise, $scope.currentPDF).then(function() {
          $scope.pdfInfo.data.active = (parseInt($scope.pdfInfo.data.active, 10) - 1).toString();
          PDFServer.clearCache();
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

      $scope.canDelete = function(pdf) {
        return !$scope.forms || !$scope.forms[pdf.data.id] || !$scope.forms[pdf.data.id].length;
      };

      $scope.deletePDF = function(pdf) {
        $scope.currentPDF = pdf;
        ngDialog.open({
          template: 'views/project/env/pdf/delete.html',
          scope: $scope
        });
      };

      $scope.pdfInfo = {};
      PDFServer.getInfo($scope.primaryProjectPromise).then(function(info) {
        if (!info) {
          throw {data: 'Cannot find project information.'};
        }
        $scope.pdfInfo = info;
        $scope.loading = false;
        if (info.data.plan === 'hosted') {
          $scope.onPlanChange('enterprise');
        }
      });

      // Set the filetoken if it isn't set.
      $scope.formioReady.then(function() {
        if (
          $scope.currentProject &&
          $scope.currentProject.settings &&
          !$scope.currentProject.settings.filetoken
        ) {
          $scope.currentProject.settings.filetoken = $scope.pdfInfo.data.token;
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
