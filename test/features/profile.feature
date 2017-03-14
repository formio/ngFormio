Feature: User Profile Functionality

  Scenario: Profile navigation
    Given I am logged in for profileuser1
    And I am on /#/
    And I expand the user menu
    And I click on the Profile link
    Then I am at the /#/profile/view page
    And I see the plaintext User Profile
    And I see #profile-username with the text Username: ${profileuser1.name}
    And I see #profile-email with the text Email: ${profileuser1.email}
    And I click on the Edit link
    And I wait 1000 milliseconds
    And I see the plaintext Name
    And I see an input #fullName with the value ${empty}
    And I see the plaintext Username
    And I see an input #name with the value ${profileuser1.name}
    And I see the plaintext Email
    And I see an input #email with the value ${profileuser1.email}
    And I see the plaintext Password
    And I see an input #password with the value ${empty}
    And I click on the Payment Info link
    And I see .alert with the text We never store your credit card number.

  Scenario: Update fullname
    Given I am logged in for profileuser1
    And I am on /#/profile/edit
    And I see Name
    When I enter ${random-fullName>profileuser1.fullName} in the .profile-edit-page #fullName field
    And I click the Submit button
    Then I see .alert with the text Submission was created.
    Then the user account for profileuser1 was updated with ${random} for fullName
    And the user profile for profileuser1 was changed

  Scenario: Update username
    Given I am logged in for profileuser1
    And I am on /#/profile/edit
    And I see Username
    When I enter ${random-name>profileuser1.name} in the .profile-edit-page #name field
    And I click the Submit button
    Then I see .alert with the text Submission was created.
    Then the user account for profileuser1 was updated with ${random} for name
    And the user profile for profileuser1 was changed

  Scenario: Update email
    Given I am logged in for profileuser1
    And I am on /#/profile/edit
    And I see Email
    When I enter ${random-email>profileuser1.email} in the .profile-edit-page #email field
    And I click the Submit button
    Then I see .alert with the text Submission was created.
    Then the user account for profileuser1 was updated with ${random} for email
    And the user profile for profileuser1 was changed

  Scenario: Update password
    Given I am logged in for profileuser1
    And I am on /#/profile/edit
    And I see Password
    When I enter ${random-password>profileuser1.password} in the .profile-edit-page #password field
    And I click the Submit button
    Then I see .alert with the text Submission was created.
    Then the user account for profileuser1 was updated with ${random} for password
    And the user profile for profileuser1 was changed

  Scenario: Update all profile settings
    Given I am logged in for profileuser1
    And I am on /#/profile/edit
    And I see Name
    And I see Username
    And I see Email
    And I see Password
    When I enter ${random-fullName>profileuser1.fullName} in the .profile-edit-page #fullName field
    When I enter ${random-name>profileuser1.name} in the .profile-edit-page #name field
    When I enter ${random-email>profileuser1.email} in the .profile-edit-page #email field
    When I enter ${random-password>profileuser1.password} in the .profile-edit-page #password field
    And I click the Submit button
    Then I see .alert with the text Submission was created.
    And the user profile for profileuser1 was changed
