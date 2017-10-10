# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

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
