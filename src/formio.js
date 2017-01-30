require('./polyfills/polyfills');
var fs = require('fs');

var app = angular.module('formio', [
  'ngSanitize',
  'ui.bootstrap',
  'ui.bootstrap.datetimepicker',
  'ui.select',
  'ui.mask',
  'angularMoment',
  'ngFileUpload',
  'ngFileSaver'
]);

/**
 * Create the formio providers.
 */
app.provider('Formio', require('./providers/Formio'));

/**
 * Provides a way to register the Formio scope.
 */
app.factory('FormioScope', require('./factories/FormioScope'));

app.factory('FormioUtils', require('./factories/FormioUtils'));

app.factory('Lodash', require('./factories/Lodash'));

app.factory('formioInterceptor', require('./factories/formioInterceptor'));

app.factory('formioTableView', require('./factories/formioTableView'));

app.directive('formio', require('./directives/formio'));

app.directive('formioDelete', require('./directives/formioDelete'));

app.directive('formioErrors', require('./directives/formioErrors'));

app.directive('customValidator', require('./directives/customValidator'));

app.directive('formioSubmissions', require('./directives/formioSubmissions'));

app.directive('formioSubmission', require('./directives/formioSubmission'));

app.directive('formioComponent', require('./directives/formioComponent'));

app.directive('formioComponentView', require('./directives/formioComponentView'));

app.directive('formioElement', require('./directives/formioElement'));

app.directive('formioWizard', require('./directives/formioWizard'));

app.directive('formioBindHtml', require('./directives/formioBindHtml.js'));

/**
 * Filter to flatten form components.
 */
app.filter('flattenComponents', require('./filters/flattenComponents'));
app.filter('tableComponents', require('./filters/tableComponents'));
app.filter('tableView', require('./filters/tableView'));
app.filter('tableFieldView', require('./filters/tableFieldView'));
app.filter('safehtml', require('./filters/safehtml'));
app.filter('formioTranslate', require('./filters/translate'));

app.config([
  '$httpProvider',
  '$injector',
  function(
    $httpProvider,
    $injector
  ) {
    if (!$httpProvider.defaults.headers.get) {
      $httpProvider.defaults.headers.get = {};
    }

    // Make sure that ngAnimate doesn't mess up loader.
    try {
      $injector.get('$animateProvider').classNameFilter(/^((?!(fa-spinner|glyphicon-spin)).)*$/);
    }
    /* eslint-disable no-empty */
    catch (err) {}
    /* eslint-enable no-empty */

    // Disable IE caching for GET requests.
    $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.get.Pragma = 'no-cache';
    $httpProvider.interceptors.push('formioInterceptor');
  }
]);

app.run([
  '$templateCache',
  function($templateCache) {
    // The template for the formio forms.
    $templateCache.put('formio.html',
      fs.readFileSync(__dirname + '/templates/formio.html', 'utf8')
    );

    $templateCache.put('formio-wizard.html',
      fs.readFileSync(__dirname + '/templates/formio-wizard.html', 'utf8')
    );

    $templateCache.put('formio-delete.html',
      fs.readFileSync(__dirname + '/templates/formio-delete.html', 'utf8')
    );

    $templateCache.put('formio/submission.html',
      fs.readFileSync(__dirname + '/templates/formio-submission.html', 'utf8')
    );

    $templateCache.put('formio/submissions.html',
      fs.readFileSync(__dirname + '/templates/formio-submissions.html', 'utf8')
    );

    // A formio component template.
    $templateCache.put('formio/component.html',
      fs.readFileSync(__dirname + '/templates/component.html', 'utf8')
    );

    $templateCache.put('formio/component-view.html',
      fs.readFileSync(__dirname + '/templates/component-view.html', 'utf8')
    );

    $templateCache.put('formio/element-view.html',
      fs.readFileSync(__dirname + '/templates/element-view.html', 'utf8')
    );

    $templateCache.put('formio/errors.html',
      fs.readFileSync(__dirname + '/templates/errors.html', 'utf8')
    );
  }
]);

require('./components');
