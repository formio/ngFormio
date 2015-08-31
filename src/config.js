/**
 * This config assumes the app and server are running on the same domain.
 */
var protocol = window.location.protocol;
var host = window.location.host;
var serverHost = host;
var parts = host.split('.');
if (parts[0] === 'portal') {
  parts.shift();
  serverHost = parts.join('.');
}
var apiProtocol = (host.split(':')[0] !== 'localhost') ? 'https' : protocol;
var appBase = protocol + '//' + host;
var apiBase = apiProtocol + '//api.' + serverHost;
var formioBase = apiProtocol + '//formio.' + serverHost;
angular.module('formioApp').constant('AppConfig', {
  forceSSL: false,
//  domain: host,
  appBase: appBase,
  tutorial: 'http://help.form.io/start',
  apiBase: apiBase,
  userForm: formioBase + '/user',
  userLoginForm: formioBase + '/user/login',
  userRegisterForm: formioBase + '/user/register',
  teamForm: formioBase + '/team',
  betaForm: formioBase + '/beta'
});
