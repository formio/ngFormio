Feature: Creating/Editing the Resource
   
Scenario:  Accessing the Resource page
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    When I enter ${random-title>project1.title} in the #title field
    And I enter ${random-description>project1.description} in the #description field
    And I click on the Create Project button
    When I click on Resources text element
    Then I am taken to Resources page
    Then I see User resource
    Then I see Admin resource

Scenario: Clicking more Info help button
    Given I am logged in for projuser1
    And I am on /#/
    When I click on the #create-custom-project element
    When I enter ${random-title>project1.title} in the #title field
    And I enter ${random-description>project1.description} in the #description field
    And I click on the Create Project button
    When I click on Resources text element
    Then I am taken to Resources page