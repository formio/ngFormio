Feature : Creating Editing a form

Scenario: Clicking ‘Data’ button for Resource on Resource page
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
    Then I see User Login form
    Then I see User Register form
    Then I see User resource
    Then I see Admin resource 

Scenario: Searching for existing Forms/Resource with search bar 
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
    When I enter Lo in the #form-search field
    Then I see User Login form
    And I donot see User Register form
    When I enter R in the #form-search field
    Then I see User Register form
    When I enter Us in the #resource-search field
    Then I see User resource
    And I donot see Admin resource
    When I enter A in the #resource-search field
    Then I see Admin resource
    And I donot see User resource


Scenario: Searching for non existing Forms in search bar
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
    When I enter Z in the #form-search field
    And I wait 1000 milliseconds
    And I donot see any Forms  forms
    When I enter Z in the #resource-search field
    And I wait 1000 milliseconds
    And I donot see any Resource Forms forms
    And I wait 1000 milliseconds
    When I clear the #form-search field
    Then I see User Login form
    Then I see User Register form
    And I wait 1000 milliseconds
    When I clear the #resource-search field
    Then I see User resource
    Then I see Admin resource

Scenario: Clicking ‘Edit’ button for Form on Form page
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
	When I click on glyphicon-edit button for User Login form
    And I wait 1000 milliseconds
    Then I am on the edit page of ${project3.title} project
    And I wait 1000 milliseconds
    And I see the Email component
    And I see the Password component

Scenario: Clicking ‘Data’ button for Form on Form page
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
	When I click on fa-table button for User Login form 
    Then I am on the submission page of ${project3.title} project
    Then I see the submissions datagrid

Scenario: Clicking ‘Action’ button for Form on Form page
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
	When I click on fa-paper-plane button for User Login form 
    Then I am on the action page of ${project3.title} project
    And I wait 1000 milliseconds
    Then I see the Login action

Scenario: Clicking ‘Access’ button for Form on Form page
	Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
    When I click on fa-lock button for User Login form
    Then I am on the permission page of ${project3.title} project
    Then I see Anonymous roles for User Login form 

Scenario:Deleting a ‘Form’
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    And I wait 1000 milliseconds
    When I click on the .fa-tasks element
    And I wait 1000 milliseconds
    Then I am taken to Forms page
    When I click on glyphicon-trash button for User Login form
    And I wait 1000 milliseconds
    And I see button.btn.btn-danger with the text Yes
    And I click the Yes button
    And I wait 500 milliseconds
    Then I am taken to Forms page
    And I donot see User Login form







    