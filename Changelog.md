# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 2.45.0
### Changed
 - Reverted change to iframe src using blob.

## 2.44.0
### Changed
 - Changed the pdf to use local hosting.
 - Show the errors of a pdf above the submit button.

## 2.43.0
### Changed
 - Reverted local iframe src configurations for PDF building until we have time to resolve issues described @ https://stackoverflow.com/questions/48604989/load-iframe-into-the-page-using-chrome-extension-content-script.

## 2.42.0
### Fixed
 - Problems where the select would not allow just string results.
 - Crashes with the pdf displays.

## 2.41.0
### Changed
 - Upgrade dependencies.
 - Add local iframe src configuration for PDF building
 - Add handler for validation errors for PDF's

## 2.40.0
### Fixed
 - Problem where the decimal would not show up on new iOS devices.

## 2.39.0
### Changed
 - Returned back fix for select autocomplete not working
 
### Fixed
 - UI issues with hidden autocomplete input for selects

## 2.39.0-beta.1
### Changed
 - Reverted change for select autocomplete that was causing issues with legacy forms.

## 2.38.4
### Chagned
 - Add min/max items file component validation

## 2.38.3
### Changed
 - Upgraded gulp to latest version.

### Fixed
 - File component not showing errors

## 2.38.2
### Fixed
 - Use input mask when manually entering date/time into a datetime component.

## 2.38.1
### Fixed
 - A build issue with angular-ckeditor.

## 2.38.0
### Fixed
 - Fixed Selectboxes missing false values for pristine checkboxes

### Changed
 - Upgraded dependencies.

## 2.37.4
### Added
 - FOR-2210: Added ability to provide HTML attributes for components inputs, enabled autocomplete for select

### Fixed
 - Replace unmantained dependency that uses bower

## 2.37.3
### Fixed
 - Pin angular version to 1.7.5 to get around ng-required issue that is affecting the renderer.
   https://github.com/angular/angular.js/issues/16814

## 2.37.2
### Changed
 - Upgraded dependencies.

## 2.37.1
### Fixed
 - Problems with broadcast to offline mode causing a crash with $scope.$apply.

## 2.37.0
### Changed
 - Upgraded angular@1.7.6, angular-sanitize@1.7.6, node-qunit-phantomjs@2.0.1, formiojs@3.12.3, moment@2.24.0, eslint@5.12.1

### Fixed
 - Issue with the wizards performing a submission even when "url" is provided and it is supposed to have the noSubmit flag set.

## 2.36.9
### Fixed
 - FOR-1849: Fixed Number component value being 0 when customDefaultValue is empty string

## 2.36.8
### Fixed
 - FOR-1763: Fixed issues with the day component data collecting.

## 2.36.7
### Fixed
 - Token issue for iframe.

## 2.36.6
### Added
 - A way to deleted a non-required Select dropdown field.

## 2.36.5
### Fixed
 - Form component `tableView`.

### Chnaged
 - Upgrade dependencies.

## 2.26.0
### Fixed
 - Issue where Formio class would not be created in file component.

### Changed
 - Upgraded gulp-uglify@3.0.1 karma@2.0.5 eslint@5.3.0 gulp-rename@1.4.0 formiojs@3.1.0

### Added
 - CSS classes for wizard buttons
 - Fixed Edit Grid's and Data Grid's tableView crashing on null values
 - Added ability to provide HTML attributes for components inputs
 - CSS classes for SelectBoxes label

## 2.25.4
### Fixed
 - Issue where Formio.fieldData is not defined and should use FormioUtils instead.

## 2.25.3
### Fixed
 - Issue with build where formiojs was not getting included.

## 2.25.2
### Changed
 - Upgraded core renderer and other dependencies.

## 2.35.1
### Changed
 - Upgraded core renderer which introduces Okta SSO integration.

## 2.35.0
### Fixed
 - File fields where a file was added and removes are crashing data view on portal.

### Changed
 - Inputs store invalid value.

### Fixed
 - `tableView` for File component.

## 2.34.2
### Fixed
 - Upgraded formiojs to 3.0.0-rc.4 which contains formData method.

## 2.34.1
### Fixed
 - Issues with the formData method not being exposed to FormioUtils.
 - PDF forms to allow for the url context of the form to be passed to the pdf.

## 2.34.0
### Fixed
 - Required Checkbox submission loading.
 - Problems with the wizard component not keeping the baseUrl configuration.
 - How the baseUrl is handled within components.
 - Fixed typo in default settings for requireDecimal
 - Fix issue where checkbox radios set default to boolean.

### Added
 - `row` value into Button's custom logic.
 - Add option to wizard to not use localStorage.

### Changed
 - Default setting for hideLabel on Panels should be false.
 - Upgraded dependencies vanilla-text-mask@5.1.1, browserify@16.2.2, gulp-rename@1.2.3, angular@1.7.0, angular-sanitize@1.7.0, babel-preset-env@1.7.0, gulp-debug@4.0.0, uglifyify@5.0.0, gulp-wrap@0.14.0

## 2.33.2
### Fixed
 - Update new syntax for importing from formio.js v3.x

## 2.33.1
### Changed
 - Update formio.js to v3.0.0-alpha19 to fix issue with file uploads losing returned data for urls.

## 2.33.0
### Added
 - Save as State action to button component
 - Ability to skip validation if state is draft
 - Delete action to button component

### Fixed
 - Validation inside DataGrid.
 - Validation for EditGrid.
 - Handling of unique validation.
 - Datagrid add button not appearing after maximum rows setting removed

### Reverted
 - Collapsible fieldsets and panels. This was causing issues with validation and will be in 3.x branch only.

### Changed
 - Update formio.js version to v2.32.0

## 2.32.1
### Changed
 - Increased formio.js version to fix issue with throwing errors.

## 2.32.0
### Changed
 - Update submitForm promise handler to be more compatible with other promise libraries.

### Added
 - Possibility to hide body for Panel and FieldSet.
 - `getView(component, data)` option for EditGrid body template.
 - Add data as a variable to editgrid row template.
 - Add custom validator logic to datagrid.

### Fixed
 - Components validation inside layout.
 - Interpolation inside EditGrid.
 - Select component with multiple values and default value.
 - Front-end indication on unique validation.
 - Autofocus feature.
 - Components navigation using `Tab`.
 - Select, Address, Resource Disable

## 2.31.2
### Fixed
 - Issues with nested form validations.

## 2.31.1
### Fixed
 - Validation of nested forms.
 - Nested form table view.
 - Spell check for WYSIWYG.

### Changed
 - Removed uiSelectOpenOnFocus directive.

### Added
 - Adding "data" variable exposed to EditGrid templates.
 - Table view for File component.

## 2.31.0
### Fixed
 - Fixed default value for Number component.
 - Table view of Number and Currency components.
 - Fix issue where editgrid and datagrid don't update when external data is changed.
 - Removed double loadForm() method from form components.
 - Fix oauth button crashing when settings aren't set.

### Added
 - Ability to specify decimalLimit on currency and number (including 0 for integer)
 - Ability to require decimals
 - Ability to override decimalSeparator and delimiter per language in options.

### Changed
 - Preserve original file name and display it if available.
 - Upgrade formio.js to 2.30.0

## 2.30.2
### Changed
 - Upgraded text-mask-addons@3.7.2, moment@2.21.0, formiojs@2.29.11

### Fixed
 - Removed deprecated setAppUrl.
 - Problems where hideLabel is not set for other layout components.

## 2.30.1
### Fixed
 - Problems where DataGrid would not show labels of input elements in columns.

## 2.30.0
### Changed
 - Changed component ID's to not use the component key, but rather formio-{{ component.type }}-{{ component.key }}
   in order to keep application style collisions to a minimum.

## 2.29.6
### Fixed
 - Fixed the label positions for left and right.

### Changed
 - The provided ID for content components so that it does not collide with page components.

## 2.29.5
### Added
 - Default label for HTML component and hide label.

## 2.29.4
### Fixed
 - Ensure that autofocus is set to false for text areas.

## 2.29.3
### Changed
 - The default labels and keys to be something more practical.

## 2.29.2
### Fixed
 - How labels are shown (or not) within the DataGrid.

## 2.29.1
### Fixed
 - Issue where if a component shows its label in a datagrid, it would also show up in the header. That is redundant.

## 2.29.0
### Changed
 - The datagrid to use thead for header and tbody for content.
 - Upgraded formiojs@2.29.6, bootstrap-ui-datetime-picker@2.6.1, eslint@4.18.1, browserify@16.1.0

### Fixed
 - Many issues with labels and hide label.

## 2.28.6
### Changed
 - Upgraded formio.js to 2.29.3

## 2.28.5
### Fixed
 - Currency component to default with delimiter set.
 - Components with input mask when they have multiple values.

### Added
 - OAuth initiated logins.

## 2.28.4
### Added
 - Emit of 'formError' event on next page for Wizard.

### Fixed
 - Search Filter setting not working correctly for Select Component with Raw JSON Data Source Type
 - Arrow keys in Day component.
 - Formio library to use the "default" export of formiojs.
 - Issue with subform submissions not loading due to check for empty data.

### Changed
 - Upgraded formiojs to latest version.

## 2.28.3
### Added
 - 'delimiter' property for Number component.
 -  scope variable to custom buttons

### Fixed
 - Error messages in console for Survey and EditGrid components.
 - Prevent WYSIWYG settings from merging unintentionally

## 2.28.2
### Fixed
 - Issue with the logic around the Checkbox hidelabel setting.
 - Problem with ngModel dependency on buttons.
 - Fix issue where old values stayed in option for "clearOnRefresh"

## 2.28.1
### Changed
 - The logic to the button to use new Function instead of eval.

### Added
 - The _merge method from lodash to be accessible to the custom action on Buttons.

## 2.28.0
### Changed
 - Upgrade formiojs to 2.27.0

### Added
 - Need to introduce a new "action" for buttons that will allow you to provide your own url, where it submits the data to that url. Add on submit button and optional URL to post the data to the url
 - Need to include in the submission which button was pressed
 - Autofocus configuration for fields.
 - Way to disable spellcheck of wysiwyg.

### Fixed
 - Issue when pressing tab key the data in select persist
 - Fix datagrids improperly slicing when maxlength set.

## 2.27.5
### Fixed
 - Problem where "_" is undefined for number and currency components.

## 2.27.4
### Changed
 - Upgrade formiojs to latest to fix inputMask issue.

## 2.27.3
### Added
 - Mask validator for Phone Number.

### Fixed
 - Default value for component with input mask.

## 2.27.2
### Fixed
 - Issue with the file upload component where it would not show errors.
 - Issue with file upload in read-only allowing you to delete files from the grid.

### Changed
 - Upgraded formio.js to 2.27.6

### Added
 - Datagrid's add another position logic

## 2.27.1
### Fixed
 - Issue where when files are removed, required validation no longer works correctly.

### Changed
 - Upgraded formiojs to 2.27.3 to fix checkCalculated issue.

## 2.27.0
### Chagned
 - Upgraded formiojs dependency.
 - Changed the clearOnHide option for forms to true.

## 2.26.5
### Added
 - Confirmation to cancel a wizard.

### Fixed
 - Bugfix/button disable

### Changed
 - Upgraded formiojs to version 2.25.8
 - Show mask by default on masked fields.

## 2.26.4
### Fixed
 - Other regressions with the disabled submit buttons.

## 2.26.3
### Fixed
 - Issue with disableOnInvalid flag with pristine forms.

## 2.26.2
### Fixed
 - Problems with the disableOnInvalid flag not working with buttons.

## 2.26.1
### Fixed
 - Fix nesting forms multiple levvels deep
 - ng-disabled dynamic update issue
 - Fix number, currency, and time components issues with new input mask

## 2.26.0
### Changed
 - Replaced the ui-mask library and replaced with the core renderer masking system.

## 2.25.9
### Fixed
 - Issue with getDownloadUrl by upgrading formio.js

## 2.25.8
### Fixed
 - Reverted https://github.com/formio/ngFormio/commit/d7bf526a6d581680d156561972821b63ce65a4b5 which was breaking Select components to resources.
 - Datagrid not rendering properly in submission view.

### Added
 - Proper check of Select component project configuration to add /project if it is a mongoId.

## 2.25.7
### Fixed
 - Problem with select dropdowns loading within a nested form.

### Added
 - Possibility to include 'owner' property in submission.

## 2.25.6
### Fixed
 - Issue where the Number component with multiple checked would not render form correctly.

## 2.25.5
### Removed
 - The multiple flag from editgrid component since it is not needed.

## 2.25.4
### Changed
 - Upgraded dependencies.

## 2.25.3
### Fixed
 - Issue with loading submissions in a form without revisions enabled. (Upgrade formio.js to 2.24.2)

## 2.25.2
### Fixed
 - Fixed error message on EditGrid row save.
 - Select resource not properly instanciating with base URL.
### Added
 - Possibility to use moment APIs to set min/max date for DateTime component.
 - Alerts to PDF.
### Changed
 - Min/Max date for DateTime component doesn't transform to UTC.
 - Load submissions before forms so form versions can be found from submissions.

## 2.25.1
### Fixed
 - Issue where the label placement was getting messed up on form builder views.

## 2.25.0
### Added
 - Min and Max size options for file uploads.
 - Possibility to specify label position for component and for options for Checkboxes and Radio components.
 - Possibility to add shortcuts.
 - Display custom validation error message.

### Fixed
 - Issue with navigating backward with wizards and validating the current page.

## 2.24.2
### Fixed
 - Removed the css for overflow on formio forms.

## 2.24.1
### Fixed
 - Scroll bars for form appearing every time.
 - Fix ensure value on select component when it is a multiple field.
 - Issue with validation not working with selectboxes. Also how form is submitted.
 - Fixed Wizard Progress Bar on Mobile

## 2.24.0
### Changed
 - Upgraded all dependencies.

### Fixed
 - Make sure to always show labels within a form builder.

## 2.23.12
### Fixed
 - Empty disabled signature component.
 - Editing nested forms mapped to another resource with save as another resource returns 404.
 - Min and max date for Datetime component.
 - Issues with using the renderer without Lodash installed globally.

## 2.23.10
### Fixed
 - The tooltip to be below the input controls for multiple inputs.

### Changed
 - Upgrade formio.js to 2.19.2

### Added
 - Tooltip for button component.

## 2.23.9
### Fixed
 - Wizard refresh losing data
 - Field descriptions not translatable.

## 2.23.8
### Fixed
 - Fix typo on-click should be ng-click for Edit Grid
 - Fixed an issue with multi-form workflows where next page would not execute.
 - Fixed multi-line tooltips.

### Added
 - Add tooltip for resource component with Add button checked

## 2.23.7
### Changed
 - Make formioTranslate filter stateful
 - Upgrade angular-moment to 1.1.0

### Fixed
 - The form component to pass along the form options and readOnly states.

## 2.23.6
### Changed
 - Pass along the building flag through the options.

## 2.23.5
### Added
 - Mask textfields if input should be hidden.
 - Tooltips to components

### Fixed
 - Issue where the form component would not refresh when new submission data was presented.

## 2.23.4
### Fixed
 - Columns show logic in formio-submission directive.

## 2.23.3
### Fixed
 - Issue where the button error would show up if they did not click the button.
 - Misspelling in one of the templates.

## 2.23.2
### Fixed
 - Issue where the urls for the Resource and Select options could get in bad state.

## 2.23.1
### Fixed
 - Issue with the form component for certain option configurations.

## 2.23.0
### Added
 - EditGrid component

## 2.22.6
### Fixed
 - Form component

### Added
 - Validation feedback on the submit button for a form with errors.

## 2.22.5
### Fixed
 - Default values for multi value fields no longer defaulted to have one field already open.

## 2.22.4
### Fixed
 - Submission handler crashes if no save submission action on form.

## 2.22.3
### Fixed
 - Re-enable fix for select component.

## 2.22.2
### Fixed
 - TextArea component in FormioSubmission directive.
 - Clearing value of the component which conditionally displayed from a Select component.

## 2.22.1
### Changed
 - Upgraded formio.js to 2.16.0

## 2.22.0
### Fixed
 - Fix submission message on update.

### Changed
 - Default phone number fields to have input type of "tel"
 - Upgraded formio.js to 2.16.0 to add cookie fallback in old browsers.

## 2.21.5
### Changed
 - Upgraded formio.js to 2.15.2

## 2.21.3
### Fixed
 - The download url for pdf to use the core javascript library.
 - Fixed crash in FormioUtils each error handling assigning property to a string
 - Search and filter for Select component.

## 2.21.2
### Fixed
 - Issues with number/floats not parsing correctly.
 - The PDF download button to hit the correct api.

### Added
 - Support submission of form components which are not in wizard panels
 - Submit subforms on the page when wizard's Previous button is clicked

## 2.21.1
### Added
 - Error labels to show when an error has occured.

### Fixed
 - Errors with required file uploads.
 - The file upload not showing the error messages.
 - File uploads not working within wizards that pass the url to the directive.
 - Issue with clearOnHide flag not setting properly on container components.

## 2.20.18
### Changed
 - Upgraded formio.js to 2.13.2

## 2.20.17
### Fixed
 - Some select urls were being double encoded.

## 2.20.16
### Changed
 - Upgraded all dependencies.

## 2.20.15
### Fixed
 - An issue where the Signature component would send an undefined URL request.
 - Issue where FormioUtils.hasCondition was not defined for wizard forms.

## 2.20.14
### Added
 - A way to change the submit message with a form json configuration.

### Changed
 - Upgrade formiojs to 2.13.1

### Fixed
 - Issue with custom code execution for buttons within other components.

## 2.20.13

### Fixed
 - Problem where if you would change the source of Select to resource it would crash the preview.
 - Issue where checkbox validation errors would not highlight the checkbox field.
 - An issue where JSON Logic conditionals were not getting triggered for multi-page forms.

## 2.20.12
## 2.20.11
## 2.20.10
## 2.20.9
## 2.20.8

 - No release to synchronize versions with form builder library.

## 2.20.7
## 2.20.6
## 2.20.5

### Fixed
 - Columns components hiding if width is not set.
 - Hide form alert on valid form.
 - Fixed issue with required file uploads not enforcing a file upload.
 - Display issue for the survey component.
 - Removed the $hashKey from the form submission.

### Added
 - Custom javascript logic to execute on button click.
 - Take initial values for resource component search from URL
 - Emit events on File component upload success or failure

## 2.20.4
### Fixed
 - An error that would show up if $scope.options was not defined.

## 2.20.3
### Fixed
 - The submission view for text area with wysiwyg.

## 2.20.2
--- SAME AS 2.19.7: Released to sync with form builder library. ---

## 2.19.7
### Fixed
 - Day component.
 - Dependencies for the wysiwyg component.
 - Issue where a reset form would not set the form to pristine again.
 - Fixed the readOnly display of wysiwyg text areas to show the html content.

## 2.19.6
### Added
 - Allow passing in a baseUrl for forms on a different path.
 - Time component.

## 2.19.5
### Changed
 - Change tableView default to false for layout components.

### Added
 - Add tableView template for panel component.

## 2.19.4
### Fixed
 - Issue with the iframe not setting the readonly flag properly on submissions.

## 2.19.3
### Fixed
 - Issues with jsonLogic where the library was not shared with FormioUtils.
 - Issue with a bad class within the columns component.

## 2.19.2
### Fixed
 - Fix radio buttons validation highlighting.
 - Fix select component crashing if no submission.
 - Fix signature component within columns.

## 2.19.1
### Added
 - Added 'disable limiting response' option for select component with url as datasource.

### Fixed
 - Default issue with the number field.
 - Fix select url interpolation inside a datagrid to have both data and row.

## 2.19.0
### Added
 - Form component to allow for complex multi-form workflows.
 - Dynamic next page to the wizard.
 - Hook system that allows any external system to hook into the submit and nextPage handlers.

### Changed
 - Moved the default value checks to a common utils file to save code duplication.
 - Moved calculated values into utils for code simplification.
 - Upgrade ng-dialog to v1.3.0
 - Upgrade bootstrap-ui-datetime-picker to v2.6.0

## 2.18.5
### Added
 - Add headers to Select Urls if specified.

### Fixed
 - Fields inside a panel inside a wizard didn't highlight properly if validation failed.
 - Survey components didn't hightlight validations properly.

## 2.18.4
### Fixed
 - Fixed issues with validation on submit
 - Fixed select not searching and loading more properly.

## 2.18.3
### Fixed
 - Changed Object.assign to lodash assign for compatibility.

## 2.18.2
### Added
 -  Allow interpolation of file directories for uploads.

### Changed
 - Select resource components use Formio provider instead of $http.get to allow offline compatibility.

### Fixed
 - Fixed false value for checkbox.

## 2.18.1
### Added
 - Add setProjectUrl and getProjectUrl options to FormioProvider.
 - Allow formio wizard to be naviagle without completion using wizardFreeNavigation parameter.

## 2.18.0
### Fixed
 - An empty array was being appended to select data values when editing fields.

### Added
 - Ability to specify width, offset, push and pull on columns.

## 2.17.2
### Fixed
 - Issue with ngDialog not getting added to module dependencies.

## 2.17.1
### Fixed
 - File upload in wizards wasn't working.

## 2.17.0
### Changed
 - Removed sourcemaps from build files.

### Added
 - Updated bugfix for FOR-404
 - TableView rendering to all layout components

### Fixed
 - Issue where form components inside containers, inside layout components, inside containers would not render in the
   submission grid.
 - Issue where form components inside data grids, inside layout components, inside containers would not render in the
   submission grid.
 - Issue with the signature component, where the size of the input field was also used for the component which would
   allow for its footer label to be covered by other components.
 - Fixing issue where certain api responses would be stored as json strings rather than error messages
 - Issue where the submit on "action" was passing the wrong object to the submit handlers.
 - Issue where the select search would not reset when they clear out the search box.

## 2.16.6
### Changed
 - Upgrade formio.js to 2.7.3
 - Changed the jsonLogic to use both row and data for logic.
 - No longer use "jsonConditionals" in favor of "conditions.json" property.

## Removed
 - jsonLogic from conditionals since that is now handled within the formio.js library.

## 2.16.5
### Removed
 - FOR-404 fix, as it regressed the submission grid for 2.16.4

## 2.16.4
### Fixed
 - Issue where the datetime meridian could become un-synchronized from the component settings format field and show
   different meridian settings
 - Issue where the datetime meridian was not consistent between the submission grid and submission view.
 - Issue where viewing a submission with a datetime component and default value didnt display on the first rendering of
   the edit state.

## 2.16.3
### Fixed
 - Issue where "success" on $http is deprecated and is now using regular promise "then"

## 2.16.2
### Changed
 - Changed how the temp tokens are added to the pdf submission download url.

## 2.16.1
### Changed
 - Changed how the download token is added to the URL to keep ELB from clobbering it.

## 2.16.0
### Added
 - The ability to add inline Resources with an "Add Resource" button on Resource components.
 - Adding iframe support to allow for iframe rendered forms and control over those forms.
 - Configurable input types for checkboxes to be either a checkbox or radio input.

### Changed
 - Upgrade formiojs to 2.6.0
 - Upgrade ng-dialog to 1.1.0

## 2.15.8
### Fixed
 - Fixing issue with meridian support and time selection in the datetime component
 - Changed the yearRange attribute for the datetime component to yearRows and yearColumns, to reflect changes made to
   the angular 1 component.
 - Fixed min/max validation issues with the datetime component
 - Fixed an issue with the survey component and default values rendering.
 - Fixed an issue with the survey component not getting submission values bound in certain view states
 - Fixed merge conflict and missing comma in object properties

## 2.15.7
### Changed
 - The type on the button component to use ng-attr-type so that it works with IE.

## 2.15.6
### Added
 - An index.html example page

### Changed
 - Upgraded ui-select to 0.19.8

## 2.15.4
### Fixed
 - Datetime component won't load existing dates on submissions.

## 2.15.3
### Added
 - Allow translating month part of day component.

### Fixed
 - Could not type in datetime component until a date was selected.

## 2.15.2
### Fixed
 - Upgraded formiojs library to 2.4.2 to fix token persistence issues.

## 2.15.1
### Fixed
 - Fixed placeholder attributes on some fields
 - Fixed angular translate functionality
