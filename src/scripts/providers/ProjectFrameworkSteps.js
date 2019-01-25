'use strict';

var app = angular.module('formioApp');

app.constant('ProjectFrameworkSteps', function(framework) {
  var steps = [
    {
      step: 'start',
      noTitle: true,
      title: 'Welcome',
      icon: 'fa fa-check-circle',
      template: 'views/project/tour/welcome.html',
      next: 'Application Setup'
    },
    {
      step: 'download',
      title: 'Application Setup',
      icon: 'fa fa-sliders',
      template: 'views/project/tour/download.html',
      children: [
        {
          step: 'download',
          title: 'Download',
          next: 'Download a StarterKit Application',
          icon: 'fa fa-download',
          template: 'views/project/tour/download.html'
        },
        {
          step: 'configure',
          title: 'Configure',
          next: 'Configure the starterkit application',
          icon: 'fa fa-sliders',
          template: 'views/project/tour/configure.html'
        }
      ]
    },
    {
      step: 'user',
      title: 'Admin User',
      next: 'Create an Admin user for your application',
      icon: 'fa fa-user-plus',
      template: 'views/project/tour/user.html',
      children: []
    },
    {
      step: 'form',
      title: 'Create a Form',
      icon: 'fa fa-wpforms',
      template: 'views/project/tour/form.html',
      children: [
        {
          step: 'form',
          title: 'Add a new form',
          next: 'Create a new form to put in your application',
          icon: 'fa fa-newspaper-o',
          template: 'views/project/tour/form.html'
        },
        {
          step: 'action',
          title: 'Add an action',
          next: 'Add an email action to your form',
          icon: 'fa fa-mail-reply',
          template: 'views/project/tour/action.html'
        }
      ]
    },
    {
      step: 'embed',
      title: 'Embed the form',
      next: 'Embed the form within your application',
      icon: 'fa fa-code',
      template: 'views/project/tour/embed.html',
      children: []
    },
    {
      step: 'launch',
      title: 'Launch',
      next: 'Launch your application',
      icon: 'fa fa-rocket',
      template: 'views/project/tour/launch.html',
      children: []
    },
    {
      step: 'next',
      title: 'Next Steps',
      next: 'See what else you can do with Form.io',
      icon: 'fa fa-chevron-circle-right',
      template: 'views/project/tour/next.html',
      children: []
    }
  ];

  switch(framework) {
    case 'angular':
      steps[1].template = 'views/frameworks/angular/download.html';
      steps[1].children[0].template = 'views/frameworks/angular/download.html';
      steps[1].children[1].template = 'views/frameworks/angular/configure.html';
      steps[4].template = 'views/frameworks/angular/embed-app.html';
      break;
    case 'angular2':
      steps[1].template = 'views/frameworks/angular2/download.html';
      steps[1].children[0].template = 'views/frameworks/angular2/download.html';
      steps[1].children[1].template = 'views/frameworks/angular2/configure.html';
      steps[4].template = 'views/frameworks/angular2/embed-app.html';
      steps[5].template = 'views/frameworks/angular2/launch.html';
      break;
    case 'aurelia':
      steps[1].template = 'views/frameworks/aurelia/download.html';
      steps[1].children[0].template = 'views/frameworks/aurelia/download.html';
      steps[1].children[1].template = 'views/frameworks/aurelia/configure.html';
      steps[4].template = 'views/frameworks/aurelia/embed-app.html';
      steps[5].template = 'views/frameworks/aurelia/launch.html';
      break;
    case 'react':
      steps[1].template = 'views/frameworks/react/download.html';
      steps[1].children[0].template = 'views/frameworks/react/download.html';
      steps[1].children[1].template = 'views/frameworks/react/configure.html';
      steps[4].template = 'views/frameworks/react/embed-app.html';
      break;
    case 'vue':
      steps[1].template = 'views/frameworks/vue/download.html';
      steps[1].children[0].template = 'views/frameworks/vue/download.html';
      steps[1].children[1].template = 'views/frameworks/vue/configure.html';
      steps[4].template = 'views/frameworks/vue/embed-app.html';
      break;
    case 'html5':
      break;
    case 'simple':
      steps[4].template = 'views/frameworks/simple/embed-app.html';
      delete steps[5];
      delete steps[2];
      delete steps[1];
      steps.splice(4, 0, {
        step: 'configure',
        title: 'Configure access',
        next: 'Configura access to your form',
        icon: 'fa fa-lock',
        template: 'views/frameworks/simple/configure.html',
        children: []
      });
      steps[5].next = 'Use the form';
      steps[5].title = 'Use the form';
      break;
    case 'custom':
    case 'javascript':
      steps[1].template = 'views/frameworks/custom/download.html';
      steps[1].children = [];
      steps[4].template = 'views/frameworks/custom/embed-app.html';
      delete steps[5];
      break;
  }

  return steps;
});
