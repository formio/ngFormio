// If environment configurations are passed in the querystring, first override existing configurations.
var query = Qs.parse(window.location.search.substr(1));
if (query.hasOwnProperty('environments') && query.hasOwnProperty('currentEnvironment')) {
  localStorage.setItem('environments', JSON.stringify(query.environments));
  localStorage.setItem('currentEnvironment', JSON.stringify(query.currentEnvironment));
  // Ensure they are logged out since we are switching environments
  localStorage.removeItem('formioToken');
  localStorage.removeItem('formioUser');
  // Rebuild the window url and replace without the environment querystrings.
  if (history.replaceState) {
    var url = window.location.protocol
      + "//"
      + window.location.host
      + window.location.pathname
      + window.location.hash;

    history.replaceState({page: url}, document.getElementsByTagName('title')[0].innerHTML, url);
  }
}

var host = window.location.host;
var environment = JSON.parse(localStorage.getItem('currentEnvironment'));
var protocol = window.location.protocol;
var serverHost, apiProtocol;
var pathType = 'Subdomains';


if (environment) {
  var parts = environment.url.split('//');
  apiProtocol = parts[0];
  serverHost = parts[1];
  pathType = environment.type || 'Subdomains';
}
else {
  serverHost = host;
  apiProtocol = (serverHost.split(':')[0] !== 'localhost') ? 'https:' : protocol;
  var parts = serverHost.split('.');
  if (parts[0] === 'portal' || parts[0] === 'beta') {
    parts.shift();
    serverHost = parts.join('.');
  }
  //if (parts[0] === 'beta') {
  //  parts.shift();
  //  parts[0] = 'test-' + parts[0];
  //  serverHost = parts.join('.');
  //}
}

// Force portal and server to match protocols if not on localhost.
if (apiProtocol !== protocol && ['localhost', 'portal.localhost', 'lvh.me', 'portal.lvh.me'].indexOf(window.location.hostname) === -1) {
  var response = confirm('The API protocol (' + apiProtocol + ') is different than this portal (' + protocol + '). Switch to ' + apiProtocol + '?');
  if (response) {
    var url = apiProtocol
      + "//"
      + window.location.host
      + window.location.pathname;

    // Add environment information if set.
    if (localStorage.getItem('environments') && localStorage.getItem('currentEnvironment')) {
      url += '?' + Qs.stringify({
          environments: JSON.parse(localStorage.getItem('environments')),
          currentEnvironment: JSON.parse(localStorage.getItem('currentEnvironment'))
        });
    }
    url += window.location.hash;

    // If running under http, confirm switching back to https to prevent looping.
    if (protocol === 'http:') {
      if (confirm('The API server is running under HTTPS. Do you want to switch the portal as well? (Recommended)')) {
        setTimeout(function() {
          window.location.replace(url);
        }, 100);
      }
    }
    else {
      setTimeout(function() {
        window.location.replace(url);
      }, 100);
    }
  }
}

var appBase = protocol + '//' + host;
var apiBase = apiProtocol + '//api.' + serverHost;
var formioBase = apiProtocol + '//formio.' + serverHost;
if (['form.io', 'test-form.io'].indexOf(serverHost) ===  -1 && pathType !== 'Subdomains') {
  apiBase = apiProtocol + '//' + serverHost;
  formioBase = apiProtocol + '//' + serverHost + '/formio';
}

angular.module('formioApp').constant('AppConfig', {
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
