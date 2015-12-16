Feature: Register Functionality

  Scenario: Empty Register
    Given I am on /#/auth
    And I am logged out
    When I wait 200 milliseconds
    Then the REGISTER button is disabled

  Scenario: Username only
    Given I am on /#/auth
    And I am logged out
    When I enter ${register-username} in the .register-container #user\.name field
    Then the REGISTER button is disabled

  Scenario: Bad email
    Given I am on /#/auth
    And I am logged out
    When I enter bademail in the .register-container #user\.email field
    Then the REGISTER button is disabled
    And I see Email must be a valid email.

  Scenario: Mismatched passwords
    Given I am on /#/auth
    And I am logged out
    When I enter ${register-username} in the .register-container #user\.name field
    And I enter ${register-email} in the .register-container #user\.email field
    And I enter ${register-password} in the .register-container #user\.password field
    And I enter ${register-password}Bad in the .register-container #verifyPassword field
    Then the REGISTER button is disabled
    When I wait 1000 milliseconds
    And I see Passwords must match

  Scenario: Username unique
    Given an account exists with the username ${register-username}, email ${register-email} and password ${register-password}
    And I am on /#/auth
    And I am logged out
    When I enter ${register-username} in the .register-container #user\.name field
    And I enter ${register3-email} in the .register-container #user\.email field
    And I enter ${register-password} in the .register-container #user\.password field
    And I enter ${register-password} in the .register-container #verifyPassword field
    And I click the REGISTER button
    Then I see an alert with the text Username must be unique.

  Scenario: Email unique
    Given an account exists with the username ${register-username}, email ${register-email} and password ${register-password}
    And I am on /#/auth
    And I am logged out
    When I enter ${register3-username} in the .register-container #user\.name field
    And I enter ${register-email} in the .register-container #user\.email field
    And I enter ${register-password} in the .register-container #user\.password field
    And I enter ${register-password} in the .register-container #verifyPassword field
    And I click the REGISTER button
    Then I see an alert with the text Email must be unique.

  Scenario: Successful registration
    And I am on /#/auth
    And I am logged out
    When I enter ${register2-username} in the .register-container #user\.name field
    And I enter ${register2-email} in the .register-container #user\.email field
    And I enter ${register2-password} in the .register-container #user\.password field
    And I enter ${register2-password} in the .register-container #verifyPassword field
    And I click the REGISTER button
    Then I have been logged in
