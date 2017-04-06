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
    And I click on the Create Project button

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
    And I click on the Create Project button

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
    When I click on the #nav-bar-settings-link element
    And I see .alert.alert-success with the text Project Settings are encrypted for your protection.

  Scenario: Save project settings (no changes)
    Given I am logged in for projuser3
    And A project exists with the ${random-title>project4.title} and ${random-description>project4.description}
    And I am on /#/
    Then I see .project.well>h4>a with the text ${project4.title}
    When I click on the Manage button
    Then I am on the ${project4.title} project portal
    When I click on the #nav-bar-settings-link element
    And I click on the Save Project button
    Then I see a notification with the text Project saved.

  Scenario: Cant save project after removing its title
    Given I am logged in for projuser4
    And A project exists with the ${random-title>project5.title} and ${random-description>project5.description}
    And I am on /#/
    Then I see .project.well>h4>a with the text ${project5.title}
    When I click on the Manage button
    Then I am on the ${project5.title} project portal
    When I click on the #nav-bar-settings-link element
    And I enter ${empty} in the input#title field
    Then the Save Project button is disabled

  Scenario: Cant save project with a long title or long description
    Given I am logged in for projuser4
    And A project exists with the ${random-title>project5.title} and ${random-description>project5.description}
    And I am on /#/
    Then I see .project.well>h4>a with the text ${project5.title}
    When I click on the Manage button
    Then I am on the ${project5.title} project portal
    When I click on the #nav-bar-settings-link element
    And I enter 1234567890123456789012345678901234567890123456789012345678901234 in the input#title field
    And I see the plaintext Project Title cannot be longer than 63 characters.
    When I enter 123456789012345678901234567890123456789012345678901234567890123412345678901234567890123456789012345678901234567890123456789012341234567890123456789012345678901234567890123456789012345678901234123456789012345678901234567890123456789012345678901234567890123412345678901234567890123456789012345678901234567890123456789012341234567890123456789012345678901234567890123456789012345678901234123456789012345678901234567890123456789012345678901234567890123412345678901234567890123456789012345678901234567890123456789012345 in the input#description field
    And I see the plaintext Description cannot be longer than 512 characters.
    Then the Save Project button is disabled

  Scenario: Can save project after removing its description
    Given I am logged in for projuser5
    And A project exists with the ${random-title>project6.title} and ${random-description>project6.description}
    And I am on /#/
    Then I see .project.well>h4>a with the text ${project6.title}
    When I click on the Manage button
    Then I am on the ${project6.title} project portal
    When I click on the #nav-bar-settings-link element
    And I enter ${empty} in the input#description field
    And I click on the Save Project button
    Then I see a notification with the text Project saved.

  Scenario: Deleting a project warnings
    Given I am logged in for projuser6
    And A project exists with the ${random-title>project7.title} and ${random-description>project7.description}
    And I am on /#/
    Then I see .project.well>h4>a with the text ${project7.title}
    When I click on the Manage button
    Then I am on the ${project7.title} project portal
    When I click on the #nav-bar-settings-link element
    Then I see the plaintext Deleting a project will make it disappear forever! This cannot be undone, so make sure you really want to delete it.
    And I see a.btn.btn-danger with the text Delete
    And I click on the Delete link
    Then I see .project-section-inner-content h2 with the text Are you sure you wish to delete the Project
    And I see button.btn.btn-danger with the text Yes
    And I click the Yes buttons
    Then I see a notification with the text You are not authorized to view some data on this page. Project was deleted!
