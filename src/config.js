/**
 * This config assumes the app and server are running on the same domain.
 */
var protocol = window.location.protocol;
var host = window.location.host;
var serverHost = host;
var parts = serverHost.split('.');
if (parts[0] === 'portal') {
  parts.shift();
  serverHost = parts.join('.');
}
var apiProtocol = (serverHost.split(':')[0] !== 'localhost') ? 'https:' : protocol;
var appBase = protocol + '//' + host;
var apiBase = apiProtocol + '//api.' + serverHost;
var formioBase = apiProtocol + '//formio.' + serverHost;
angular.module('formioApp').constant('AppConfig', {
  forceSSL: false,
//  domain: host,
  appBase: appBase,
  serverHost: serverHost,
  protocol: apiProtocol,
  tutorial: 'http://help.form.io/start',
  apiBase: apiBase,
  userForm: formioBase + '/user',
  userLoginForm: formioBase + '/user/login',
  userRegisterForm: formioBase + '/user/register',
  userLinkGithubForm: formioBase + '/user/link/github',
  paymentForm: formioBase + '/payment',
  commercialContactForm: formioBase + '/commercialcontact',
  teamForm: formioBase + '/team',
  betaForm: formioBase + '/beta',
  feedbackForm: formioBase + '/feedback',
  resetPassForm: formioBase + '/resetpass'
});
