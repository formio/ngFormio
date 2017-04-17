Feature: Project Overview - Project Info Functionality 

  Scenario: Viewing ‘Project Info’ information
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 2000 milliseconds
    Then I see project progress is at 15%
    Then I see Roles
    Then I see the Administrator link in Roles section
    Then I see the Anonymous link in Roles section
    Then I see the Authenticated link in Roles section
    Then I see Resources
    Then I see the User link in Resources section
    Then I see the Admin link in Resources section
    Then I see Forms 
    Then I see the User Login link in Forms section
    Then I see the User Register link in Forms section
    When I click the Upgrade Project link
    Then I see the .project-upgrade-dialog modal

  Scenario Outline: Navigating to Forms/Resources from Project Info section
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click the [link] link
    Then I see the plaintext [text] 

  Examples:
    | link                    | text                  |
    | User Login              | User Login Form       |
    | User Register           | User Register Form    |
    | User                    | User Resource         |          
    | Admin                   | Admin Resource        |
      
  Scenario Outline: Navigating to Roles from Project Info section
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click the [link] link
    Then I am on the edit page with Edit [text] Role 
  
  Examples:
    |link         |text           |
    |Administrator|Administrator  |
    |Anonymous    |Anonymous      |
    |Authenticated|Authenticated  |

  Scenario: Navigating to Portal from project overview
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click on the #home-button element
    And I am on /#/
    
  Scenario: Navigating to Portal from project overview
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click on the image with source images/formio-logo.png
    And I am on /#/

  Scenario: Deleting a Role will remove the Role in the ‘Overview’ section UI
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click the Authenticated link
    Then I am on the edit page with Edit Authenticated Role
    When I click on the Delete link
    And I see button.btn.btn-danger with the text Yes
    And I click the Yes button
    And I click on the .progress-radial element
    Then I donot see the Authenticated link in Roles section

  Scenario: Deleting a Form will remove the Form in the ‘Overview’ section UI
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click on the .fa-tasks element
    When I click on the glyphicon glyphicon-trash button for User Login form
    And I see button.btn.btn-danger with the text Yes
    And I click the Yes button
    And I click on the .progress-radial element
    Then I donot see the User Login link in Forms section

#  Scenario: Deleting a Resource will remove the Resource in the ‘Overview’ section UI
#    Given I am logged in for profileuser3
#    And I am on the ${project3.title} project overview page
#    When I click on the .fa-database element
#    When I click on the glyphicon glyphicon-trash button for Admin form
#    And I see button.btn.btn-danger with the text Yes
#    And I click the Yes button
#    And I click on the .progress-radial element
#    Then I donot see the Admin link in Resources section





    
