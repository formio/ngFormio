import './polyfills/polyfills';
import fs from 'fs';
import util from 'formiojs/util';

import FormioProvider from './providers/Formio';
import Formio from './directives/formio';
import FormioWizard from './directives/formioWizard';

var app = angular.module('formio', []);

/**
 * Create the formio provider.
 */
app.provider('Formio', FormioProvider);

/**
 * Provides a way to register the Formio scope.
 */
app.factory('FormioUtils', util);

app.directive('formio', Formio);

app.directive('formioWizard', FormioWizard);
