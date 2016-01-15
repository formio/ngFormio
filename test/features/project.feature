Feature: Project Functionality

  Scenario: Project creation (empty template)
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    Then I see the plaintext New Project
    And I see the plaintext Project Title
    And I see the plaintext Description
    And I see the plaintext Select a template
    When I enter ${random-title>project1.title} in the #title field
    And I enter ${random-description>project1.description} in the #description field
    When I click on the Create Project button
    And I see .alert with the text Congratulations! You have just created a working Web application using Form.io.
    And I click on the Got it! button
    Then I am on the ${project1.title} project portal
    And I see .project-description with the text ${project1.description}
    And I see #project-plan-display with the text Basic

  Scenario: Required title
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    Then I see the plaintext New Project
    And I see the plaintext Project Title
    And I see the plaintext Description
    And I see the plaintext Select a template
    Then the Create Project button is disabled

  Scenario: Optional description
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    Then I see the plaintext New Project
    And I see the plaintext Project Title
    And I see the plaintext Description
    And I see the plaintext Select a template
    When I enter ${random-title>project2.title} in the #title field
    Then the Create Project button is disabled
    When I click on the Create Project button
    And I see .alert with the text Congratulations! You have just created a working Web application using Form.io.
    And I click on the Got it! button
    Then I am on the ${project2.title} project portal
    And I see #project-plan-display with the text Basic

  Scenario: Character limits
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    Then I see the plaintext New Project
    And I see the plaintext Project Title
    And I see the plaintext Description
    And I see the plaintext Select a template
    When I enter 1234567890123456789012345678901234567890123456789012345678901234 in the #title field
    Then I see the plaintext Project Title cannot be longer than 63 characters.
    And I enter 123456789012345678901234567890123456789012345678901234567890123412345678901234567890123456789012345678901234567890123456789012341234567890123456789012345678901234567890123456789012345678901234123456789012345678901234567890123456789012345678901234567890123412345678901234567890123456789012345678901234567890123456789012341234567890123456789012345678901234567890123456789012345678901234123456789012345678901234567890123456789012345678901234567890123412345678901234567890123456789012345678901234567890123456789012345 in the #description field
    Then I see the plaintext Description cannot be longer than 512 characters.

  # Make a new user for testing because its difficult to narrow down the project tile correctly for the manage button.
  Scenario: View project settings
    Given I am logged in for projuser2
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on /#/
    Then I see .project.well>h4>a with the text ${project3.title}
    When I click on the Manage button
    Then I am on the ${project3.title} project portal
    And I wait 100 milliseconds
    When I click on the #nav-bar-settings-link element
    And I see .project-section-header>p with the text Each project contains its own settings for configuring 3rd Party Interfaces, Database connections, Roles & Permissions, and more.
    And I see .alert.alert-success with the text Project Settings are encrypted for your protection.

#  Scenario: Save project settings (no changes)
#    Given I am logged in for projuser3
#    And A project exists with the ${random-title>project4.title} and ${random-description>project4.description}
#    And I am on /#/
#    Then I see .project.well>h4>a with the text ${project4.title}
#    When I click on the Manage button
#    Then I am on the ${project4.title} project portal
#    And I wait 100 milliseconds
#    When I click on the #nav-bar-settings-link element
#    And I click on the Save button
#    Then I see a notification with Project Saved.