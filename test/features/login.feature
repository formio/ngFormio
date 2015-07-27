Feature: Login Functionality

  Scenario: Empty login
    Given I am on /project/#/auth/login
    And I am logged out
    When I click the Submit button
    Then I have not been logged in
    And I see an alert with the text Password not provided.

  Scenario: Bad password
    Given an account exists with the email test@example.com and the password Testpass
    And I am on /project/#/auth/login
    And I am logged out
    When I enter test@example.com in the #user\.email field
    And I enter Badpass in the #user\.password field
    And I click the Submit button
    Then I have not been logged in
    And I see an alert with the text Incorrect password

  Scenario: Missing email
    Given I am on /project/#/auth/login
    And I am logged out
    When I enter Badpass in the #user\.password field
    And I click the Submit button
    Then I have not been logged in
    And I see an alert with the text Missing username

  Scenario: Logging in
    Given an account exists with the email test@example.com and the password Testpass
    And I am on /project/#/auth/login
    And I am logged out
    When I enter test@example.com in the #user\.email field
    And I enter Testpass in the #user\.password field
    And I click the Submit button
    Then I have been logged in
