Feature: Project Functionality

  Scenario: Project creation (empty)
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    Then I see New Project
    And I see Project Title
    And I see Description
    And I see Select a template
    When I enter ${random-title>project1.title} in the #title field
    And I enter ${random-description>project1.description} in the #description field
    When I click on the Create Project button
    Then I see #projectWelcomeModalLabel with the text Your application is ready to go!
    And I see .alert with the text Congratulations! You have just created a working Web application using Form.io.
