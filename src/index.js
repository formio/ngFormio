import "babel-polyfill";
import util from 'formiojs/utils';

import './providers';
import './directives';

const app = angular.module('formio', []);
