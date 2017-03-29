Feature: Support Request Functionality

  Scenario: Submitting a support form without value in ‘Email’ field
    Given I am on /support/ help page
    When I enter Test-name in the #fullName field 
    And I enter ${empty} in the #email field
    Then the Submit button is disabled

  Scenario: Submitting a support form without value in Name field 
    Given I am on /support/ help page
    When I enter email@test.com in the #email field 
    And I enter ${empty} in the #fullName field
    Then the Submit button is disabled

  Scenario: Submitting a support request
    Given I am on /support/ help page
    When I enter Test-name in the #fullName field
    And I enter email@test.com in the #email field
    And I enter Test_Message in the #message field
    Then the Submit button is enabled
    When I click on the Submit button
    Then I see .alert with the text Submission was created.	
    And I am on /support/ help page