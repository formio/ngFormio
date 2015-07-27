Feature: Home Page Brochure

  Scenario: At the home page
    Given I am on the home page
    Then I am at the home page

  Scenario: The home page loads
    Given I am on the home page
    Then the title is Form.IO - Fastest form & API workflow - anywhere

  Scenario: The Go to Beta link works.
    Given I am on the home page
    When I click on the Go to Beta link
    Then I am on the /project/#/auth/register page
