'use strict';

var app = angular.module('formioApp');

app.constant('ProjectFrameworks', [
  {
    title: 'Javascript',
    name: 'javascript',
    img: 'images/platforms/javascript.png'
  },
  {
    title: 'AngularJS',
    hide: true,
    name: 'angular',
    img: 'images/platforms/angularjs1.svg'
  },
  {
    title: 'Angular',
    name: 'angular2',
    img: 'images/platforms/angular2.png'
  },
  {
    title: 'React',
    name: 'react',
    img: 'images/platforms/react.svg'
  },
  {
    title: 'Vue.js',
    name: 'vue',
    img: 'images/platforms/vue.png'
  },
  {
    title: 'Aurelia',
    name: 'aurelia',
    img: 'images/platforms/aurelia.svg'
  },
  {
    title: 'Stand-Alone Forms',
    name: 'simple',
    img: 'images/platforms/form.png'
  },
  {
    title: 'Custom',
    name: 'custom',
    img: 'images/empty-project.png'
  },
]);
