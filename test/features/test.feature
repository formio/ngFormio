Feature: testing
  Scenario: Navigating to the  Credit Card input page
    Given I am logged in for profileuser3
    And I am on /#/
    And I expand the user menu
    And I click on the Payment Info link
    Then I am at the /#/profile/payment/view page
    And I wait 1000 milliseconds
    When I click on the icon btn btn-primary
    Then I am at the /#/profile/payment/edit page

  Scenario: Adding valid Credit Card to profile
    Given I am at the /#/profile/payment/edit page
    When I enter Test Creditcard in the #cardholderName field
    And I enter 4111111111111111 in the #ccNumber field
    And I select 02 in #ccExpiryMonth
    When I enter 25 in the Expiry field
    And I enter 123 in the #securityCode field
    When I click the Submit button
