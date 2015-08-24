/**
 * This config assumes the app and server are running on the same domain.
 */
var protocol = window.location.protocol;
var host = window.location.host;
var serverHost = host;
var appBase = protocol + '//' + host;
var apiBase = protocol + '//api.' + serverHost;
var formioBase = protocol + '//formio.' + serverHost;
angular.module('formioApp').constant('AppConfig', {
  forceSSL: false,
  domain: host,
  appBase: appBase,
  tutorial: appBase + '/start',
  apiBase: apiBase,
  userForm: formioBase + '/user',
  userLoginForm: formioBase + '/user/login',
  userRegisterForm: formioBase + '/user/register',
  teamForm: formioBase + '/team',
  betaForm: formioBase + '/beta'
});
