var host = window.location.host;
var protocol = window.location.protocol;
var serverHost, apiProtocol;
var pathType = 'Subdomains';

/** DO NOT CHANGE THESE LINES!! **/
var onPremise = false;
var hostedPDFServer = '';
var sso = '';
var ssoTeamsEnabled = false;
var ssoLogout = '';
/*******************************/

// Parse query string
var query = {};
var hashes = location.hash.substr(1).replace(/\?/g, '&').split("&");
var hashpath = '';

// Look in the location.
location.search.substr(1).split("&").forEach(function(item) {
  query[item.split("=")[0]] = item.split("=")[1] && decodeURIComponent(item.split("=")[1]);
});

// Also look in hashes.
hashes.forEach(function (item) {
  parts = item.split('=');
  if (parts.length > 1) {
    query[parts[0]] = parts[1] && decodeURIComponent(parts[1]);
  }
  else if (item.indexOf('/') === 0) {
    hashpath = '/#' + item;
  }
});

if (query['x-jwt-token']) {
  localStorage.setItem('formioToken', query['x-jwt-token']);
  localStorage.removeItem('formioAppUser');
  localStorage.removeItem('formioUser');
  window.history.pushState("", "", hashpath);
}

var parts = host.split('.');
if (parts[0] === 'portal' || parts[0] === 'beta'|| parts[0] === 'alpha' || parts[0] === 'next' || parts[0] === 'edge') {
  parts.shift();
  host = parts.join('.');
}

if (host.indexOf('localhost') !== 0) {
  serverHost = host;
  apiProtocol = protocol;
}
else {
  serverHost = 'localhost:3000';
  apiProtocol = 'http:';
}

var appBase = protocol + '//' + window.location.host;
var apiBase = apiProtocol + '//api.' + serverHost;
var formioBase = apiProtocol + '//formio.' + serverHost;
var pdfServer = apiProtocol + '//files.' + serverHost;
var licenseServer = apiProtocol + '//license.' + serverHost;
if (onPremise) {
  apiBase = apiProtocol + '//' + serverHost;
  formioBase = apiProtocol + '//' + serverHost + '/formio';
  pdfServer = hostedPDFServer || 'https://files.form.io';
  licenseServer = 'https://license.form.io';
  pathType = 'Subdirectories';
}
if (host.indexOf('localhost') === 0) {
  licenseServer = 'http://localhost:3006';
}

var disable = false;
var loading = false;
if (Formio) {
  Formio.setBaseUrl(apiBase);
  Formio.setProjectUrl(formioBase);
  if (sso && query.skipSsoAuth !== 'true') {
    if (query.saml) {
      window.location.hash = localStorage.getItem('redirectUrl');
      localStorage.removeItem('redirectUrl');
    }
    else {
      localStorage.setItem('redirectUrl', location.hash);
    }
    loading = Formio.ssoInit(sso, {
      forceAuth: true
    });
    // Check if already logged in
    if (!loading) {
      // We are starting the handshake process with SSO, disable the app for now.
      disable = true;
    }
  }
  if ('loadModules' in Formio) {
    Formio.loadModules();
  }
}
angular.module('formioApp').constant('AppConfig', {
  appVersion: 'APP_VERSION',
  copyrightYear: (new Date()).getFullYear().toString(),
  sso: sso,
  ssoTeamsEnabled: ssoTeamsEnabled,
  ssoLogout: ssoLogout,
  loading: loading,
  disable: disable,
  pathType: pathType,
  forceSSL: false,
  pdfPrice: 10,
  onPremise: onPremise,
  appBase: appBase,
  apiBase: apiBase,
  formioBase: formioBase,
  apiProtocol: apiProtocol,
  apiServer: serverHost,
  serverHost: serverHost,
  protocol: apiProtocol,
  pdfServer: pdfServer,
  pdfHostedPrice: 50,
  pdfHostedForms: 25,
  pdfHostedSubs: 1000,
  licenseServer,
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
  resetPassForm: formioBase + '/resetpass'
});
