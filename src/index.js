import "babel-polyfill";
import util from 'formiojs/utils';

import FormioProvider from './providers/Formio';
import Formio from './directives/formio';
//import FormioWizard from './directives/formioWizard';

const app = angular.module('formio', []);

/**
 * Create the formio provider.
 */
app.provider('Formio', FormioProvider);

/**
 * Provides a way to register the Formio scope.
 */
app.factory('FormioUtils', util);

app.directive('formio', Formio);

//app.directive('formioWizard', FormioWizard);
