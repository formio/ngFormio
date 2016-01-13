Feature: User Profile Functionality

  Scenario: Profile navigation
    Given I am logged in for tempuser1
    And I am on /#/
    And I expand the user menu
    And I click on the Profile link
    Then I am at the /#/profile/view page
    And I see User Profile
    And I see Username: ${tempuser1.name}
    And I see Email: ${tempuser1.email}
    And I click on the Edit link
    And I see Name
    And I see Username
    And I see Email
    And I see Password
    And I click on the Payment Info link
    And I see We never store your credit card number.

  Scenario: Update fullname
    Given I am logged in for tempuser1
    And I am on /#/profile/edit
    And I see Name
    When I enter ${random-fullName>tempuser1.fullName} in the .profile-edit-page #fullName field
    And I click the Submit button
    Then I see an alert with the text Submission was created.
    Then the user account for tempuser1 was updated with ${random} for fullName
    And the user profile for tempuser1 was changed

  Scenario: Update username
    Given I am logged in for tempuser1
    And I am on /#/profile/edit
    And I see Username
    When I enter ${random-name>tempuser1.name} in the .profile-edit-page #name field
    And I click the Submit button
    Then I see an alert with the text Submission was created.
    Then the user account for tempuser1 was updated with ${random} for name
    And the user profile for tempuser1 was changed

  Scenario: Update email
    Given I am logged in for tempuser1
    And I am on /#/profile/edit
    And I see Email
    When I enter ${random-email>tempuser1.email} in the .profile-edit-page #email field
    And I click the Submit button
    Then I see an alert with the text Submission was created.
    Then the user account for tempuser1 was updated with ${random} for email
    And the user profile for tempuser1 was changed

  Scenario: Update password
    Given I am logged in for tempuser1
    And I am on /#/profile/edit
    And I see Password
    When I enter ${random-password>tempuser1.password} in the .profile-edit-page #password field
    And I click the Submit button
    Then I see an alert with the text Submission was created.
    Then the user account for tempuser1 was updated with ${random} for password
    And the user profile for tempuser1 was changed

  Scenario: Update all profile settings
    Given I am logged in for tempuser1
    And I am on /#/profile/edit
    And I see Name
    And I see Username
    And I see Email
    And I see Password
    When I enter ${random-fullName>tempuser1.fullName} in the .profile-edit-page #fullName field
    When I enter ${random-name>tempuser1.name} in the .profile-edit-page #name field
    When I enter ${random-email>tempuser1.email} in the .profile-edit-page #email field
    When I enter ${random-password>tempuser1.password} in the .profile-edit-page #password field
    And I click the Submit button
    Then I see an alert with the text Submission was created.
    And the user profile for tempuser1 was changed
