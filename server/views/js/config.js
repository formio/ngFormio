angular.module('formioApp').constant('AppConfig', {
  forceSSL: {{ forceSSL }},
  appBase: '{{ host }}/app',
  apiBase: '{{ host }}/app/api',
  tutorial: '{{ host }}/start',
  userForm: '{{ formioHost }}/app/api/user',
  userLoginForm: '{{ formioHost }}/app/api/user/login',
  userRegisterForm: '{{ formioHost }}/app/api/user/register',
  teamForm: '{{ formioHost }}/app/api/team',
  betaForm: '{{ formioHost }}/app/api/beta'
});
