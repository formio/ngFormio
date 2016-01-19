Feature: Register Functionality

  Scenario: Empty Register
    Given I am on /#/auth
    And I am logged out
    When I wait 500 milliseconds
    Then the REGISTER button is disabled

  Scenario: No username
    Given I am on /#/auth
    And I am logged out
    When I enter ${random-email} in the .register-container #user\.email field
    And I enter ${random-password>register.password} in the .register-container #user\.password field
    And I enter ${register.password} in the .register-container #verifyPassword field
    Then the REGISTER button is disabled

  Scenario: No email
    Given I am on /#/auth
    And I am logged out
    When I enter ${random-name} in the .register-container #user\.name field
    And I enter ${random-password>register.password} in the .register-container #user\.password field
    And I enter ${register-password} in the .register-container #verifyPassword field
    Then the REGISTER button is disabled

  Scenario: No password
    Given I am on /#/auth
    And I am logged out
    When I enter ${random-email} in the .register-container #user\.email field
    And I enter ${random-name} in the .register-container #user\.name field
    And I enter ${random-password} in the .register-container #verifyPassword field
    Then the REGISTER button is disabled

  Scenario: No verify password
    Given I am on /#/auth
    And I am logged out
    When I enter ${random-email} in the .register-container #user\.email field
    And I enter ${random-name} in the .register-container #user\.name field
    And I enter ${random-password} in the .register-container #user\.password field
    Then the REGISTER button is disabled

  Scenario: Bad email
    Given I am on /#/auth
    And I am logged out
    When I enter bad-email in the .register-container #user\.email field
    Then the REGISTER button is disabled
    And I see Email must be a valid email.

  Scenario: Mismatched passwords
    Given I am on /#/auth
    And I am logged out
    When I enter ${random-name} in the .register-container #user\.name field
    And I enter ${random-email} in the .register-container #user\.email field
    And I enter ${random-password} in the .register-container #user\.password field
    And I enter ${random-password} in the .register-container #verifyPassword field
    Then the REGISTER button is disabled
    When I wait 1000 milliseconds
    And A help block shows with the text Passwords must match.

  Scenario: Username unique
    Given an account exists with the username ${random-name>register.name}, email ${random-email>register.email} and password ${random-password>register.password}
    And I am on /#/auth
    And I am logged out
    When I enter ${register.name} in the .register-container #user\.name field
    And I enter ${random-email} in the .register-container #user\.email field
    And I enter ${random-password>register2.password} in the .register-container #user\.password field
    And I enter ${register2.password} in the .register-container #verifyPassword field
    And I click the REGISTER button
    Then I see .alert with the text Username must be unique.

  Scenario: Email unique
    Given an account exists with the username ${random-name>register2.name}, email ${random-email>register2.email} and password ${random-password>register2.password}
    And I am on /#/auth
    And I am logged out
    When I enter ${random-name>register3.name} in the .register-container #user\.name field
    And I enter ${register2.email} in the .register-container #user\.email field
    And I enter ${random-password>register3.password} in the .register-container #user\.password field
    And I enter ${register3.password} in the .register-container #verifyPassword field
    And I click the REGISTER button
    Then I see .alert with the text Email must be unique.

  Scenario: Successful registration
    And I am on /#/auth
    And I am logged out
    When I enter ${random-name>register3.name} in the .register-container #user\.name field
    And I enter ${random-email>register3.email} in the .register-container #user\.email field
    And I enter ${random-password>register3.password} in the .register-container #user\.password field
    And I enter ${register3.password} in the .register-container #verifyPassword field
    And I click the REGISTER button
    Then I have been logged in
