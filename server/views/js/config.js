angular.module('formioApp').constant('AppConfig', {
  forceSSL: {{ forceSSL }},
  domain: '{{ domain }}',
  appBase: '{{ appHost }}/app',
  apiBase: '{{ apiHost }}',
  tutorial: 'http://help.form.io/start',
  userForm: '{{ formioHost }}/user',
  userLoginForm: '{{ formioHost }}/user/login',
  userRegisterForm: '{{ formioHost }}/user/register',
  teamForm: '{{ formioHost }}/team',
  betaForm: '{{ formioHost }}/beta'
});
