Feature: Test 16 Creating/Editing A Resource

  Background:
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click on the icon fa fa-database
    Then I am on the resource page of ${project3.title} project

  Scenario:  Accessing the Resource page
    Then I can see User in the Resources section
    And I can see Admin in the Resources section

  Scenario: Clicking ‘More Info’ help button
    When I wait 1000 milliseconds
    And I click the More info link
    Then I am on new window
    And I am on Resources section
    And I am on User's Guide section
    And I close the window

  Scenario: Searching for existing Resource in Resource search bar
    When I enter Us in the #resource-search field
    Then I can see User in the Resources section
    And I donot see Admin resource
    When I enter A in the #resource-search field
    Then I can see Admin in the Resources section
    And I donot see User resource

  Scenario: Searching for non-existing resource in the resource bar
    When I enter Z in the #resource-search field
    And I donot see any Resources forms
    When I clear the #resource-search field
    Then I can see User in the Resources section
    And I can see Admin in the Resources section

  Scenario: Clicking ‘Edit’ button for Resource on Resource page
    When I click on the glyphicon glyphicon-edit button for User form
    Then I am on the edit page of ${project3.title} project
    And I see the Email component
    And I see the Password component

  Scenario: Clicking ‘API’ button for Resource on Resource page
    When I click on the fa fa-code button for Admin form
    Then I see Key,Type,Persistent for Field in the table
    Then I see email,email,true for Email in the table
    When I click on the Read full API Documentation link
    Then I am on new window
    Then I am on API section
    And I am on Developer Info section
    Then I close the window
    And I wait 1000 milliseconds
    #When I click on the Form Endpoint link in api page
    #Then I am on new window
    #Then I see json data

  Scenario Outline: Clicking on the 'I' help icon for [method] method in row [number] in the resource api page
    When I click on the fa fa-code button for Admin form
    Then I am on the api page of ${project3.title} project
    When I click on the //table/tbody/tr[[number]]/td[2]//*[contains(text(),'[method]')]//..//a element
    Then I am on new window
    Then I see the plaintext [text]
    Then I close the window
    Examples:
      | method | number | text                |
      | GET    | 2      | Get Form            |
      | PUT    | 2      | Update Form         |
      | DELETE | 2      | Delete a Form       |
      | POST   | 4      | Create Submission   |
      | INDEX  | 4      | Submission Index    |
      | GET    | 6      | Get a Submission    |
      | PUT    | 6      | Update a Submission |
      | DELETE | 6      | Delete a Submission |

  Scenario: Clicking ‘Data’ button for Resource on Resource page
    When I click on the fa fa-table button for Admin form
    Then I am on the submission page of ${project3.title} project
    Then I see the plaintext Admin Resource

  Scenario: Clicking ‘Action’ button for Resource on Resource page
    When I click on the fa fa-paper-plane button for Admin form
    Then I am on the action page of ${project3.title} project
    Then I see the Save Submission link
    Then I see the Role Assignment link

  Scenario:Clicking ‘Access’ button for Resource on Resource page
    When I click on the fa fa-lock button for Admin form
    Then I am on the permission page of ${project3.title} project
    Then I see Administrator permission for Create All Submissions
    Then I see Administrator permission for Read All Submissions
    Then I see Administrator permission for Update All Submissions
    Then I see Administrator permission for Delete All Submissions
    Then I see Anonymous,Authenticated,Administrator permission for Read Form Definition

  Scenario:Deleting a ‘Resource’
    When I click on the glyphicon glyphicon-trash button for Admin form
    And I see button.btn.btn-danger with the text Yes
    And I click the Yes button
    And I wait 2000 milliseconds
    Then I am on the resource page of ${project3.title} project

  Scenario: Attempt to create a new Resource with blank Resource fields
    When I click on the Create Resource link
    Then I see the plaintext New Resource
    When I enter Test Resource in the #title field
    Then I see an input #name with the value testResource
    When I click on the Create Resource input button
    Then I see a notification with the text Path `path` is required.
    When I click on notification
    When I enter testResource in the #path field
    And I clear the #title field
    And I enter testResource in the #name field
    And I click on the Create Resource input button
    Then I see a notification with the text Path `title` is required.
    When I click on notification
    Then I am on the resource page of ${project3.title} project

  Scenario: Creating a new ‘Resource’
    When I click on the Create Resource link
    Then I see the plaintext New Resource
    When I enter Test Resource in the #title field
    Then I see an input #name with the value testResource
    When I enter testResource in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text Successfully created form!
    And I see an element with the Save Resource value
    When I click on the icon fa fa-database
    Then I am on the resource page of ${project3.title} project
    And I can see Test Resource in the Resources section
    When I click on the icon fa fa-tasks
    Then I am on the form page of ${project3.title} project
    And I can see Test Resource in the Resource Forms section
