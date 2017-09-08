var host = window.location.host;
var protocol = window.location.protocol;
var serverHost, apiProtocol;
var pathType = 'Subdomains';

serverHost = host;
apiProtocol = (serverHost.split(':')[0] !== 'localhost') ? 'https:' : protocol;
var parts = serverHost.split('.');
if (parts[0] === 'portal') {
  parts.shift();
  serverHost = parts.join('.');
}
if (parts[0] === 'beta') {
  parts.shift();
  parts[0] = 'test-' + parts[0];
  serverHost = parts.join('.');
}

// Force portal and server to match protocols if not on localhost.
if (apiProtocol !== protocol && ['localhost', 'portal.localhost', 'lvh.me', 'portal.lvh.me'].indexOf(window.location.hostname) === -1) {
  var response = confirm('The API protocol (' + apiProtocol + ') is different than this portal (' + protocol + '). Switch to ' + apiProtocol + '?');
  if (response) {
    var url = apiProtocol
      + "//"
      + window.location.host
      + window.location.pathname;
      + window.location.hash;

    window.location.replace(url);
  }
}

var appBase = protocol + '//' + host;
var apiBase = apiProtocol + '//api.' + serverHost;
var formioBase = apiProtocol + '//formio.' + serverHost;angular.module('formioApp').constant('AppConfig', {
  appVersion: 'APP_VERSION',
  copyrightYear: (new Date()).getFullYear().toString(),
  pathType: pathType,
  forceSSL: false,
  pdfPrice: 10,
  appBase: appBase,
  apiBase: apiBase,
  formioBase: formioBase,
  apiProtocol: apiProtocol,
  apiServer: serverHost,
  serverHost: serverHost,
  protocol: apiProtocol,
  pdfServer: 'https://files.form.io',
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
  templates: [
    {
      "title": "Default",
      "name": "default",
      "description": "A default project with User and Admin resources and their respective authentication forms.",
      "template": "https://cdn.rawgit.com/formio/formio-app-basic/2.1.1/src/project.json",
      "thumbnail": "https://app.form.io/formio-app-basic/assets/images/default-thumb.png"
    },
    {
      "title": "Sales Quote",
      "name": "salesquoteapp",
      "description": "A sales quoting project that lets agents login and manage their opportunities, customers, and contracts.",
      "template": "https://cdn.rawgit.com/formio/formio-app-salesquote/2.1.2/src/project.json",
      "thumbnail": "https://app.form.io/formio-app-salesquote/src/assets/images/salesquote-thumb.png"
    },
    {
      "title": "Service Tracker",
      "name": "servicetrackerapp",
      "description": "An application to schedule, manage and track a services based company such as home or business services.",
      "template": "https://cdn.rawgit.com/formio/formio-app-servicetracker/2.1.2/src/project.json",
      "thumbnail": "https://app.form.io/formio-app-servicetracker/assets/images/servicetracker-thumb.png"
    },
    {
      "title": "Prize Drawing",
      "name": "prizedrawingapp",
      "description": "A raffle entry project that lets participants register for a chance to win a prize! Also includes admin interface for prize drawing selection.",
      "template": "https://cdn.rawgit.com/formio/formio-app-prizedrawing/2.1.1/src/project.json",
      "thumbnail": "https://app.form.io/formio-app-prizedrawing/assets/images/prizedrawing-thumb.png"
    },
    {
      "title": "Form Manager",
      "name": "form-manager",
      "description": "A form management application that includes Form Building capabilities as well as Data management.",
      "template": "https://cdn.rawgit.com/formio/formio-app-formio/2.1.0/src/project.json",
      "thumbnail": "https://app.form.io/formio-app-formio/src/assets/images/form-manager-thumb.png"
    },
    {
      "title": "ToDo List",
      "name": "todoapp",
      "description": "An example to-do project that lets users register, login, and keep track of their to-do list.",
      "template": "https://cdn.rawgit.com/formio/formio-app-todo/2.1.0/src/project.json",
      "thumbnail": "https://app.form.io/formio-app-todo/src/assets/images/todo-thumbnail.png"
    }
  ]
});
