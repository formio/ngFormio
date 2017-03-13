#surendra 2/1/2017
Feature: {User Portal - Creating Project Templates} 9 and {Custom Project Creation}10

  Scenario Outline: Project creation ([template] template)
    Given I am logged in for projuser2
    And I am on /#/
    When I click on the image with source [url]
    Then I see a notification with the text New Project created!
    And I am on the overview page of [template] project
    When I click on the #home-button element
    Then I am on /#/ page
    And I see [template] project on the portal page

    Examples:
    |url                                                                                 |template       |
    |https://app.form.io/formio-app-basic/assets/images/default-thumb.png                |Default        |
    |https://app.form.io/formio-app-salesquote/src/assets/images/salesquote-thumb.png    |Sales Quote    |
    |https://app.form.io/formio-app-servicetracker/assets/images/servicetracker-thumb.png|Service Tracker|
    |https://app.form.io/formio-app-prizedrawing/assets/images/prizedrawing-thumb.png    |Prize Drawing  |
    |https://app.form.io/formio-app-formio/src/assets/images/form-manager-thumb.png      |Form Manager   |
    |https://app.form.io/formio-app-todo/src/assets/images/todo-thumbnail.png            |ToDo List      |

 #surendra 2/3/2017

  Scenario: Accessing the custom project page
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    Then I am on /#/create/project page

  Scenario: Clicking help links on custom project page
    Given I am on /#/create/project page
    When I click on the Getting Started Guide link
    Then I am on new window with url https://help.form.io/intro/explore/
    Given I am on /#/create/project page
    When I click on the icon glyphicon glyphicon-question-sign
    Then I am on new window with url https://help.form.io/userguide/project-templates/

  Scenario: Selecting/Highlighting template tiles
    Given I am on /#/create/project page
    Then Default project is selected by default
    #And The Default tile has green border


  Scenario: Show more template button
    When I click on the Show More Templates button
    Then The Template list is expanded
    And I see the plaintext Prize Drawing
    And I see the plaintext Form Manager
    And I see the plaintext ToDo List

  Scenario: Cancelling Custom Project page
    When I click on the Cancel link
    Then I am on /#/ page

  Scenario: Uploading a project template
    Given I am on /#/create/project page
    When I click on the icon btn btn-default btn-block btn-file

  Scenario: Creating Custom Project with no ‘Title’ value
    Given I am on /#/create/project page
    When I donot have a value in the title field
    Then the Create Project button is disabled

  Scenario Outline: Creating custom project with [template] templates
    Given I am on /#/create/project page
    When I select the [template] project template
    And I enter custom [template] in the #title field
    And I enter it is a custom [template] project in the #description field
    And I click on the Create Project button
    Then I see a notification with the text New Project created!
    And I am on the overview page of custom [template] project
    When I click on the #nav-bar-settings-link element
    Then I see an input #title with the value custom [template]
    And I see an input #description with the value it is a custom [template] project

    Examples:
      |   template       |
      |   Default        |
      |   Sales Quote    |
      |   Service Tracker|

  Scenario Outline: Creating custom project with [template] template in showmore section
    Given I am on /#/create/project page
    When I click on the Show More Templates button
    And I select the [template] project template
    And I enter custom [template] in the #title field
    And I enter it is a custom [template] project in the #description field
    And I click on the Create Project button
    Then I see a notification with the text New Project created!
    And I am on the overview page of custom [template] project
    When I click on the #nav-bar-settings-link element
    Then I see an input #title with the value custom [template]
    And I see an input #description with the value it is a custom [template] project

    Examples:
      |template     |
      |Prize Drawing|
      |Form Manager |
      |ToDo List    |
