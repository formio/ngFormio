Feature: Login Functionality

  Scenario: Empty login
    Given I am on /#/auth
    And I am logged out
    When I click the LOG IN button
    Then I have been logged out
    And I see an alert with the text Password not provided.

  Scenario: Bad password
    Given an account exists with the username ${login-username}, email ${login-email} and password ${login-password}
    And I am on /#/auth
    And I am logged out
    When I enter ${login-email} in the .login-container #user\.email field
    And I enter ${login-password}Bad in the .login-container #user\.password field
    When I click the LOG IN button
    Then I have been logged out
    And I see an alert with the text Incorrect password

  Scenario: Missing email
    Given I am on /#/auth
    And I am logged out
    When I enter Badpass in the .login-container #user\.password field
    And I click the LOG IN button
    Then I have been logged out
    And I see an alert with the text Missing username

  Scenario: Logging in
    Given an account exists with the username ${login-username}, email ${login-email} and password ${login-password}
    And I am on /#/auth
    And I am logged out
    When I enter ${login-email} in the .login-container #user\.email field
    And I enter ${login-password} in the .login-container #user\.password field
    And I click the LOG IN button
    Then I have been logged in

  Scenario: Logging out
    Given I am on /#
    When I expand the user menu
    And I click the Log Out link
    Then I have been logged out
