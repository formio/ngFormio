angular.module('formioApp').constant('AppConfig', {
  forceSSL: {{ forceSSL }},
  domain: '{{ domain }}',
  appBase: '{{ appHost }}/app',
  apiBase: '{{ apiHost }}',
  tutorial: '{{ host }}/start',
  userForm: '{{ formioHost }}/user',
  userLoginForm: '{{ formioHost }}/user/login',
  userRegisterForm: '{{ formioHost }}/user/register',
  teamForm: '{{ formioHost }}/team',
  betaForm: '{{ formioHost }}/beta'
});
