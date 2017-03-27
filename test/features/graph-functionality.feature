Feature: Project Overview - Submission Activity Grid Functionality 14

  Scenario: Viewing default ‘Submission Grid’ view
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I see an input //*[contains(@selected,'selected')] with the value string:Month
    And I see the current year/month/date next to grid view selector field
    And I see the amount of days on the X Axis of grid matching the number of days in the current month

  Scenario Outline: Switching between ‘Submission Grid’ view - [option]
    Then I see list of options Year, Month, Day on selection list
    When I click on the [option] input button
    Then I see the ‘Grid View’ switch to [number] values in the X axis

    Examples:
    |option|number|
    |Year  |12    |
    |Day   |24    |

  Scenario: Switching between ‘Submission Grid’ view - Month
    Then I see list of options Year, Month, Day on selection list
    When I click on the Month input button
    Then I see the amount of days on the X Axis of grid matching the number of days in the current month
