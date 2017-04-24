# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Fixed
 - Fixing issue with meridian support and time selection in the datetime component
 - Changed the yearRange attribute for the datetime component to yearRows and yearColumns, to reflect changes made to
   the angular 1 component.
 - Fixed min/max validation issues with the datetime component
 - Fixed an issue with the survey component and default values rendering.
 - Fixed an issue with the survey component not getting submission values bound in certain view states

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
