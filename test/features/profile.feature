Feature: User Profile Functionality

  Scenario: Profile navigation
    Given I am logged in for tempuser1
    And I am on /#/
    And I expand the user menu
    And I click on the Profile link
    Then I am at the /#/profile/view page
    And I see User Profile
    And I see Username: ${tempuser1.username}
    And I see Email: ${tempuser1.email}
