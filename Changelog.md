# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 6.9.6
### Fixed
 - Problem where the user cache would not reset when they left a team.

### Added
 - Ability to reject a team invitation.

## 6.9.5
### Changed
 - Fixed issues with PDF building where it would not show the pdf in hosted portals.

## 6.9.4
### Changed
 - Upgrade formmanager to 1.60.0
 - Update stage template exporting to allow to exclude access exports.

## 6.9.3
### Fixed
 - Credit card processing form to show the Month and Year in dropdowns.
 - Crash in the pdf display functions.

## 6.9.2
### Changed
 - Upgrade form manager to 1.59.0
 - Upgrade form view pro to 1.57.0

## 6.9.1
### Changed
 - Upgrade form manager to 1.58.0
 - Provide access to logs for any Team admin.
 - Added ssoTeamsEnabled variable and skipSsoAuth query param.
 - Added copying notes from scope
 - Prevent rewriting user with paymentInfo submission and loding the latest paymentInfo submission
 - Added ignoreCache options after adding new action

## 6.9.0
### Added
 - Added team invites

### Changed
 - Upgrade ng-formio@2.41.0
 - Upgrade ng-formio-builder@2.39.0
 - Upgrade form manager to 1.57.0
 - Upgrade tenant manager to 1.6.0
 - Upgrade @progress/kendo-ui@2020.1.115, mocha@7.0.1

## 6.8.9
### Changed
 - Small tweak to how payment methods are loaded to only return approved methods.

## 6.8.8
### Added
 - PDF configuration settings.

## 6.8.7
### Fixed
 - Issue with Jira action authentication.

### Changed
 - Upgrade Form Manager to v1.51.0
 - Upgrade formiojs@4.7.8

## 6.8.6
### Fixed
 - Staging deployments for Tenants.

### Changed
 - Upgraded Form Managaer to v1.45.0 https://github.com/formio/formmanager/blob/master/CHANGELOG.md#1450
 - Upgraded @babel/core@7.6.4, @babel/preset-env@7.6.3, @progress/kendo-ui@2019.3.1010, chance@1.1.3, dompurify@2.0.6, protractor-helpers@1.1.651, webpack@4.41.1, core-js@3.3.1, formiojs@4.3.3, swagger-ui@3.24.0, webdriverio@5.15.0

## 6.8.5
### Changed
 - Fix project limit to be a sane value so we don't overrun max_int on some systems.

## 6.8.4
### Changed
 - Upgraded ng-formio renderer that resolves bug with File component errors. https://github.com/formio/ngFormio/pull/650
 - Added the renderer version and application version to the application.

## 6.8.3
### Added
 - Added possibility to specify authorization method for OpenID.

### Changed
 - Upgraded Form Manager @ 1.43.0, Form View Pro @ 1.42.0, and Tenant Manager @ 1.3.0
 - Upgraded dompurify@2.0.3, formiojs@4.2.4, protractor-helpers@1.1.636, webdriverio@5.13.2, webpack@4.41.0, angular-swagger-ui@0.6.2

## 6.8.2
### Changed
 - Upgrade form manager to resolve issues with defining project object.

## 6.8.1
### Fixed
 - Tenant manager where you could only see 10 forms in the settings configurations.

### Changed
 - Upgraded Tenant Manager dependencies for latest angular.
 - Upgraded Form Manager for latest angular and formio.js@4.2.0-rc.7
 - Upgraded FormView Pro for latest angular and formio.js@4.2.0-rc.7 
 - Upgraded @babel/core@7.6.2, @babel/preset-env@7.6.2

## 6.8.0
### Changed
 - Upgraded depdendencies.
 - Upgraded ng-formio fronm 2.37.4 to 2.38.1: See https://github.com/formio/ngFormio/blob/2.x/Changelog.md
 - Upgraded ngFormBuilder from 2.37.6 to 2.38.0: See https://github.com/formio/ngFormBuilder/blob/master/Changelog.md

### Fixed
 - SAML redirect to not reset back to the homepage.

## 6.6.5
### Removed
 - Hubspot stylesheet

## 6.6.4
### Changed
 - Force google analytic scripts to load from https for security reasons.
 - Fix headers on remote environment requests.
 - Fix some templates loading.

## 6.6.3
### Changed
 - The configuration that adds the Public Configurations to forms to instead be at the project level for performance reasons.

## 6.6.2
### Added
 - A configuration to the form settings to add the project public configuration to the form JSON.

### Changed
 - Upgraded @babel/core@7.5.5, @babel/preset-env@7.5.5, @progress/kendo-ui@2019.2.724, lodash@4.17.15, protractor-helpers@1.1.589, webdriverio@5.11.10, copy-webpack-plugin@5.0.4, formiojs@3.24.0, mocha@6.2.0, webpack@4.38.0

## 6.6.0
### Added 
 - ActionItem log view added to portal.

## 6.5.2
### Changed
 - Fixed issues regarding the tenant manager with pagination and also introduced searching.
 - Form Manager and Form View pro to use latest renderer.
 - Upgraded  formiojs@3.22.15, protractor-helpers@1.1.568, webpack@4.35.2, ckeditor@4.12.1, swagger-ui@3.23.0

## 6.5.1
### Fixed
 - Only show the tenant button if plan is commercial or trial.
 - Several bugs with tenant application.

## 6.5.0
### Added
 - Multi-tenant functionality.
 
### Fixed
 - FOR-2349: Fixed issues where form elements are added to end of form for pdf builder. 
 
### Changed
 - Upgraded formiojs@3.22.9, protractor-helpers@1.1.564, webdriverio@5.10.9, webpack-cli@3.3.5, webpack@4.35.0

## 6.4.10
### Fixed
 - The inline embed script when using deployed portal to set the base and project properties.

## 6.4.9
### Fixed
 - Issue where the Form Manager button would show up when it shouldn't.

### Changed
 - Upgraded dependencies.

## 6.4.8
### Added
 - Direct SAML passport configuration options.

## 6.4.7
### Changed
 - Upgraded formmanager and dependencies.

## 6.4.6
### Changed
 - Upgraded Form Manager + Form View Pro to latest version
 - Upgraded  @babel/core@7.4.5, @babel/preset-env@7.4.5, babel-loader@8.0.6, protractor-helpers@1.1.538, swagger-ui@3.22.2, @progress/kendo-ui@2019.2.529, express@4.17.1, formiojs@3.21.2, webdriverio@5.9.4, webpack@4.32.2, webpack-dev-server@3.4.1, chartist@0.11.2, mini-css-extract-plugin@0.7.0
            
### Fixed
 - Fix on premise check for collections setting.

## 6.4.5
### Fixed
 - Copy/Import functionality for display and properties.

## 6.4.4
### Fixed
 - Embed codes for the deployed portal.

### Changed
 - Upgraded form manager.
 - Upgraded form view pro.

## 6.4.0
### Added
 - Group Self Access feature.
 - Updated form manager with merge capabilities.
 - Updated form manager with click-away form building protection.
 - Updated form view pro with offline support.
 - Allow SAML to provide a logout link.
 - Force the SAML SSO to re-authentication for every page refresh to ensure valid auth.
 
### Changed
 - Upgraded @babel/core@7.4.4, @babel/preset-env@7.4.4, @progress/kendo-ui@2019.1.424, copy-webpack-plugin@5.0.3, mocha@6.1.4, protractor-helpers@1.1.509, swagger-ui@3.22.1, webpack-cli@3.3.1, formiojs@3.20.4, jquery@3.4.0, node-sass@4.12.0, webdriverio@5.8.0, webpack@4.30.0

## 6.3.6
### Changed
 - Removed Moxtra

### Added
 - The ability to pick the "page" that a control is added to a PDF by modifying the component overlay settings.

## 6.2.x
### Changed
 - Adding Project configurations
 - Adding SAML project configurations.

## 6.1.8
### Changed
 - Upgraded  @progress/kendo-ui@2019.1.220, dompurify@1.0.10, swagger-ui@3.20.8, webpack@4.29.5, webdriverio@5.5.0, webpack-dev-server@3.2.0, copy-webpack-plugin@5.0.0, mocha@6.0.0

### Added
 - The Form Manager interface to the portal.form.io/manager folder for on-premise deployments.

## 6.1.5
### Added
 - SAML authentication configurations per project.
 - A way to search forms by tag or name.
 
### Changed
 - Upgraded @progress/kendo-ui@2019.1.213, angular@1.7.7, bootstrap-sass@3.4.1, swagger-ui@3.20.7, webdriverio@5.4.17, webpack@4.29.3, webpack-cli@3.2.3, ajv@6.9.1

## 6.1.2
### Fixed
 - FOR-1869: Problem with the project showing permissions error on project page

## 6.1.1
### Changed
 - Added Basic plan downgrade back as an available option.
 - The label of the Basic plan to "Downgrade".
 - The minimum project plan to be Enterprise to upgrade to deployed servers.
 - Moved the Trial button to the top of the plans when applicable.
 - Changed reCAPTCHA to "Google reCAPTCHA"

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
