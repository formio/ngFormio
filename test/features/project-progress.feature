Feature: Project Overview - Project Progress Functionality 13

 Scenario: Completing ‘Setting up project user account’ step
   Given I am logged in for projuser2
   And I am on /#/
   When I click on the image with source https://app.form.io/formio-app-basic/assets/images/default-thumb.png
   Then I see a notification with the text New Project created!
   And I am on the overview page of Default project
   Then The step Create a project has been checked
   Then I see Set up project user accounts is already expanded
   When I click the User link in Set up project user accounts of project progress
   Then I see the plaintext User Form
   When I enter test@test.com in the #email field
   And  I enter password in the #password field
   And I click on the Submit button
   Then I see a notification with the text New submission added!
   And I am taken to submission View page
   And I see project progress is at 30%
   When I click on the icon progress-radial
   Then The step Set up project user accounts has been checked

 Scenario: Completing 'Modify a form' step
   When I wait 1000 milliseconds
   Then I see Modify a form is already expanded
   When I click the Form link in Modify a form of project progress
   Then I am on the form page of Default project
   And I can see User Login in the Forms Section
   And I can see User Register in the Forms Section
   When I click on the glyphicon glyphicon-edit button for User Login resource in Forms section
   Then I am on the edit page of Default project
   When I enter first user form  in the #title field
   And I click on the Save Form input button
   And I click on the icon progress-radial
   Then I see project progress is at 45%
   And The step Modify a form has been checked

  Scenario: Completing ‘Set up Email/File Storage/Data provider’ step
    When I wait 1000 milliseconds
    Then I see Set up Email/File Storage/Data providers is already expanded
    When I click the Email Provider link in Set up Email/File Storage/Data provider of project progress
    Then I am on the email page of Default project
    When I click on the Save Settings button
    And I wait 1000 milliseconds
    Then I am on the overview page of Default project
    And I see project progress is at 55%
    And The step Set up Email/File Storage/Data provider has been checked

  Scenario: Completing ‘Clone the demo app to your local computer’ step
    When I wait 1000 milliseconds
    Then I see Clone the demo app to your local computer is already expanded
    When I click the Local App Development link in Clone the demo app to your local computer of project progress
    Then I am on Local App Development section of Launch page
    And I see project progress is at 70%
    When I click on the icon progress-radial
    Then The step Clone the demo app to your local computer has been checked

  Scenario: Completing ‘Create a new form’ step
    When I wait 1000 milliseconds
    Then I see Create a new form is already expanded
    When I click the create a form link in Create a new form of project progress
    Then I see the plaintext New Form
    When I enter new form in the #title field
    And I enter newForm in the #name field
    And I enter newForm in the #path field
    And I click on the Create Form input button
    Then I see project progress is at 85%
    When I click on the icon progress-radial
    Then The step Create a new form has been checked

  Scenario: Completing ‘Launch your application’ step
    When I wait 1000 milliseconds
    Then I see Launch your application is already expanded
    When I click the Launch link in Launch your application of project progress
    Then I am on Web App section of Launch page
    And I see project progress is at 100%
    When I click on the icon progress-radial
    Then The step Launch your application has been checked
