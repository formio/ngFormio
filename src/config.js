var host = window.location.host;
var protocol = window.location.protocol;
var serverHost, apiProtocol;
var pathType = 'Subdomains';

if (host.indexOf('localhost') !== 0) {
  serverHost = host
  apiProtocol = protocol;
}
else {
  serverHost = 'localhost:3000';
  apiProtocol = 'http:';
}
var parts = serverHost.split('.');
if (parts[0] === 'portal' || parts[0] === 'beta') {
  parts.shift();
  serverHost = parts.join('.');
}

var appBase = protocol + '//' + host;
var apiBase = apiProtocol + '//api.' + serverHost;
var formioBase = apiProtocol + '//formio.' + serverHost;
angular.module('formioApp').constant('AppConfig', {
  appVersion: 'APP_VERSION',
  copyrightYear: (new Date()).getFullYear().toString(),
  pathType: pathType,
  forceSSL: false,
  pdfPrice: 10,
  onPremise: true,
  appBase: appBase,
  apiBase: apiBase,
  formioBase: formioBase,
  apiProtocol: apiProtocol,
  apiServer: serverHost,
  serverHost: serverHost,
  protocol: apiProtocol,
  pdfServer: apiProtocol + '//files.' + serverHost,
  pdfHostedPrice: 50,
  pdfHostedForms: 25,
  pdfHostedSubs: 1000,
  pdfEnterprisePrice: 250,
  tutorial: 'https://help.form.io/start/',
  userForm: formioBase + '/user',
  userLoginForm: formioBase + '/user/login',
  userRegisterForm: formioBase + '/user/register',
  userLinkGithubForm: formioBase + '/user/link/github',
  paymentForm: formioBase + '/payment',
  commercialContactForm: formioBase + '/commercialcontact',
  pdfUploadForm: formioBase + '/pdfupload',
  teamForm: formioBase + '/team',
  betaForm: formioBase + '/beta',
  feedbackForm: formioBase + '/feedback',
  resetPassForm: formioBase + '/resetpass',
});
