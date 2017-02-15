Feature: Project Overview - Submission Activity Grid Functionality

  Scenario: Viewing default ‘Submission Grid’ view
    Given I am logged in for projuser2
    And I am on /#/
    When I click on the image with source https://app.form.io/formio-app-basic/assets/images/default-thumb.png
    Then I see a notification with the text New Project created!
    And I am on the overview page of Default project
    And The default display view for the Submission Grid is set to Month
    And I see the current year/month/date next to grid view selector field
    And I see the amount of days on the X Axis of grid matching the number of days in the current month

  Scenario Outline: Switching between ‘Submission Grid’ view - [option]
    Then I see list of options Year, Month, Day on selection list
    When I select [option] in select component
    Then I see the ‘Grid View’ switch to [number] values in the X axis

    Examples:
    |option|number|
    |Year  |12    |
    |Day   |24    |

  Scenario: Switching between ‘Submission Grid’ view - Month
    Then I see list of options Year, Month, Day on selection list
    When I select Month in select component
    Then I see the amount of days on the X Axis of grid matching the number of days in the current month










