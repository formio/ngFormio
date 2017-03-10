Feature: Login Functionality

  Scenario: Empty login
    Given I am logged out
    When I wait 200 milliseconds
    When I enter test@test.com in the .login-container #email field
    When I click the LOG IN button
    Then I have been logged out
    And I see .alert with the text Missing password

  Scenario: Bad password
    Given an account exists with the username ${random-name>login.name}, email ${random-email>login.email} and password ${random-password>login.password}
    And I am logged out
    When I enter ${login.email} in the .login-container #email field
    And I enter ${random-password} in the .login-container #password field
    When I click the LOG IN button
    Then I have been logged out
    And I wait 2000 milliseconds
    And I see .alert with the text Incorrect password

  Scenario: Missing email
    Given I am logged out
    When I enter ${random-password} in the .login-container #password field
    And I click the LOG IN button
    Then I have been logged out
    And I wait 2000 milliseconds
    And I see .alert with the text Missing username

  Scenario: Missing password
    Given I am logged out
    When I enter ${random-email} in the .login-container #email field
    And I click the LOG IN button
    Then I have been logged out
    And I wait 2000 milliseconds
    And I see .alert with the text Missing password

  Scenario: Unknown user
    Given I am logged out
    When I enter ${random-email} in the .login-container #email field
    And I enter ${random-password} in the .login-container #password field
    And I click the LOG IN button
    Then I have been logged out
    And I wait 2000 milliseconds
    And I see .alert with the text Invalid user

  Scenario: Logging in
    Given an account exists with the username ${random-name>login2.name}, email ${random-email>login2.email} and password ${random-password>login2.password}
    And I am logged out
    When I enter ${login2.email} in the .login-container #email field
    And I enter ${login2.password} in the .login-container #password field
    And I click the LOG IN button
    Then I have been logged in

  Scenario: Logging out
    Given I am on /#
    When I expand the user menu
    And I click the Log Out link
    Then I have been logged out
