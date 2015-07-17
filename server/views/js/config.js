angular.module('formioApp').constant('AppConfig', {
  forceSSL: {{ forceSSL }},
  domain: '{{ domain }}',
  appBase: '{{ host }}/app',
  apiBase: '{{ host }}/api',
  tutorial: '{{ host }}/start',
  userForm: '{{ formioHost }}/api/user',
  userLoginForm: '{{ formioHost }}/api/user/login',
  userRegisterForm: '{{ formioHost }}/api/user/register',
  teamForm: '{{ formioHost }}/api/team',
  betaForm: '{{ formioHost }}/api/beta'
});
