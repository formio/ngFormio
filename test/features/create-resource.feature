Feature: Test 16 Creating/Editing A Resource

  Scenario:  Accessing the Resource page
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    When I enter custom default in the #title field
    And I enter ${random-description>project1.description} in the #description field
    And I click on the Create Project button
    When I click on the icon fa fa-database
    Then I am on the resource page of custom default project
    And I see User resource
    And I see Admin resource

  Scenario: Clicking ‘More Info’ help button
    Then I am on the resource page of custom default project
    When I wait 1000 milliseconds
    And I click the More info link
    Then I am on new window with url https://help.form.io/userguide/resources/
    And I am on Resources section

  Scenario: Searching for existing Resource in Resource search bar
    When I enter Us in the #resource-search field
    Then I see User resource
    And I donot see Admin resource
    When I enter A in the #resource-search field
    Then I see Admin resource
    And I donot see User resource



