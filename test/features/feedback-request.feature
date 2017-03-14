Feature: Feedback Request

Scenario: Expanding Feedback modal
    Given I am on the /#/auth page
    When I click on the .feedback element
    Then I see the .feedback element 
    And I donot see Feedback

Scenario: Clicking ‘Submit’ button with no value in the ‘Feedback’ field
	Given I am on the /#/auth page
    When I click on the .feedback element
    Then I see the .feedback element
	When I enter ${empty} in the #feedback field
	Then the Send it! button is disabled
	
Scenario: Closes Feedback modal
	When I click on the .feedback-cancel element
    Then I donot see Close
	And I see .feedback with the text Feedback

Scenario: Submitting Feedback request
    Given I am on the /#/auth page
    When I click on the .feedback element
    Then I see the .feedback element
	When I enter feedback-test in the #feedback field
	And the Send it! button is enabled
	And I click on the Send it! button
    And I wait 1000 milliseconds
    And I donot see Close
	And I see .feedback with the text Feedback
