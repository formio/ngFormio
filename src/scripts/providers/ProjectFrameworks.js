'use strict';

var app = angular.module('formioApp');

app.constant('ProjectFrameworks', [
  {
    title: 'AngularJS',
    name: 'angular',
    img: 'images/platforms/angularjs1.svg'
  },
  {
    title: 'Angular',
    name: 'angular2',
    img: 'images/platforms/angular2.png'
  },
  {
    title: 'React.js',
    name: 'react',
    img: 'images/platforms/react.svg'
  },
  {
    title: 'Vue.js',
    name: 'vue',
    disabled: true,
    img: 'images/platforms/vue.png'
  },
  {
    title: 'HTML 5',
    name: 'html5',
    disabled: true,
    img: 'images/platforms/html5.png'
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
