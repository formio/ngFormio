# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 6.1.0
### Added
 - Azure Blob Storage
 - reCaptcha Support
 - Some text within the project upgrade page that lets them know why certain controls are disabled.
 - Add token parse option to projects for custom tokens.

### Removed
 - The ability to "downgrade" a project to Basic.

### Fixed
 - Fixed the embed documentation for JavaScript projects.
 - Fixed the name of the project modal when creating a new project.
 - A JavaScript crash issue when navigating from your project, back to the home page.
 - A JavaScript crash issue when logging out of your account.

### Changed
 - Upgraded dependencies including the Kendo UI Grid library.
 - Some cosmetic fixes to the Walkthrough tutorials (especially for JavaScript perojects)
 - The project upgrade page to disable the PDF Plan selection for non-paid accounts.

### Fixed
 - Resetting current viewed page to first when saving Wizard form
 - Problems with wizard forms submitting the data twice.
 - Problems with "undefined" getting appended to some controls API Keys whose parents are layout components that do have a key established.
 
## 6.0.2
### Fixed
 - Remove project limit graphs for on premise portals.

## 6.0.1
### Added
 - Project limits for forms, form requests and emails
 
## 6.0.0
### Changed
 - Build method now uses webpack and npm instead of bower and wiredep. 

## 5.11.3
### Fixed
 - Problems with the submission grid sorting.
 
### Added
 - Google Analytics to track conversions.

## 5.11.2
### Fixed
 - FOR-1799: Warning message displaying for wrong PDF plan

## 5.11.1
### Fixed
 - Form merge not working on root level
 - Remove reload on each form save.

## 5.11.0
### Added
 - Better form merging functionality
 
### Fixed'
 - CSV export not working in Data section

## 5.10.1
### Fixed
 - XSS breaking of kendo grid.

## 5.10.0
### Fixed
 - XSS issues.
 - FOR-1723: CSV export not working in Data section

## 5.9.0
### Added
 - Ability to assign teams per stage.
 - Warning when attaching files to pdfs if they haven't purchased a plan.
 - License generator to formio project.

### Fixed
 - Redirect after form submitting when form doesn't have Save Submission action.
 - Webhook validation.
 - Confirm billing plan change button.
 - Billing improvemens
 - Form custom properties fixed to be compatible with beta.
 - Embed walkthrough for vue.
 - Roles not reloading properly on refresh of page.

## 5.7.0
### Fixed
 - Adding roles to openid.
 - Disabling premium actions for independent plan.

### Added
 - Email usage indicator.

## 5.0.0
### Added
 - Overall access page in left menu
 - Project Stages!
 - Version deployments/creation
 - Locking stages
 - Framework support
 - New Environments
 - 'Not Found' option for team members search.
 - Custom Form properties.
 - Pagination for action lists

### Changed
 - Projects are created from platforms, not app templates
 - Improved Teams pages
 - Improved access permissions and descriptions
 - Fix for content component's 'unsaved changes' error message
 - The way `tableView` was used.

### Fixed
 - Environment Settings menu in IE11.
 - Alerts on Premium actions when project plan is not Basic.
 - Unique validation.
 - Error message when trying to add role mapping in OpenID authentication.

## 4.1.5
 - Upgraded ng-formio to 2.20.7
 - Upgraded ng-formio-builder to 2.20.12

## 4.1.3
 - Upgraded ng-formio to 2.20.6
 - Upgraded ng-formio-builder to 2.20.11

## 4.1.1
 - Upgraded ng-formio to 2.20.5
 - Upgraded ng-formio-builder to 2.20.5

## 4.0.18
### Changed
 - Upgraded ng-formio-builder to 2.19.4

## 4.0.16, 4.0.17
### Changed
 - Fix for content component's 'unsaved changes' error message
 - Upgraded ng-formio to 2.19.5
 - Upgraded ng-formio-builder to 2.19.3

### Removed
 - Remove form component until recursion issue fixed.

## 4.0.15
### Fixed
 - Some empty components were displaying incorrectly in submission grid.

### Changed
 - Upgraded ng-formio to 2.19.2
 - Upgraded ng-formio-builder to 2.19.2

## 4.0.14
### Changed
 - Upgraded ng-formio to 2.19.1
 - Upgraded ng-formio-builder to 2.19.1

### Fixed
 - All spinners to give feedback.
 - Bugs with Teams and Access
 - Some empty components were displaying incorrectly in submission grid.

### Removed
 - Tour
 - Environment Switcher
 - Project Templates

## 4.0.13
### Changed
 - Upgraded ng-formio to 2.18.5
 - Upgraded ng-formio-builder to 2.18.2

## 4.0.12
### Changed
 - Upgraded ng-formio to 2.18.0
 - Upgraded ng-formio-builder to 2.18.0

## 4.0.11
### Added
 - TableView rendering to all layout components

### Changed
 - Updating the add team button to only be available to the project owner.

### Fixed
 - Fixed an issue with editing teams, where you wouldn't be taken to the team view, but rather the project overview.
 - Fixed issue where the save submission action mapped to another resource would redirect you to the wrong page after
   making a new submission in the portal preview

### Changed
 - Upgraded ng-formio to 2.17.0
 - Upgraded ng-formio-builder to 2.17.0

## 4.0.10
### Changed
 - Upgraded ng-formio and ng-formio-builder to 2.16.6

## 4.0.9
### Fixed
 - Fixed issue where updating payment information would clobber the logged in users profile until a relog was performed.

## 4.0.8
### Changed
 - Upgraded ng-formio to 2.16.5 to revert tableview changes.

## 4.0.7
### Fixed
 - Fixed issue where forms saved with the content component would flag the builder as being dirty.

### Changed
 - Upgraded ng-formio to 2.16.4

## 4.0.6
### Reverted
 - Rolled back ngDialog to fix firefox issues.

### Changed
 - Upgraded ng-formio to 2.16.3

## 4.0.5
### Fixed
 - Fixed issue where the resource fields appeared twice on the save submission action configuration page.
 - Fixing issue with the form builder notifications and content component being flagged as modified on load.

### Changed
 - Upgraded ng-formio to 2.15.8
 - Upgraded ng-formio-builder to 2.15.8

## 4.0.3
### Fixed
 - Fix Go to login link on reset password done page.

## 4.0.2
### Changed
 - Updated ngFormBuilder to 2.15.1

## 4.0.1
### Changed
 - Removed test that randomly fails.

## 4.0.0
### Fixed
 - Signaturepad no longer supports bower.

### Changed
 - Updated ngFormio to 2.15.1
 - Updated ngFormBuilder to 2.15.0
