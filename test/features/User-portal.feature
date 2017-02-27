Feature: User Portal Links and Welcome Module

#Scenario: Closing the Welcome Module
    #Given I am logged in for profileuser1 
    #And I am on /#/
    #And I wait 1000 milliseconds
    #And I see .welcome-banner with the text Welcome to 
    #And I wait 2000 milliseconds
    #When I click on the .fa-close element
    #And I wait 1000 milliseconds
#Then I do not see the plaintext Welcome to
    #Then I see Step 1: Create your project project portal

#Scenario: Welcome module when Project count is zero
    #Given I am logged in for profileuser1
    #And I am on /#/
    #When My project count is zero
	#And I see .welcome-banner with the text Welcome to

#Scenario: Using the Welcome Module
    #Given I am logged in for profileuser1 
    #And I am on /#/   
    #When I click on the Getting Started with https://help.form.io/intro/welcome/
    #And I wait 2000 milliseconds
    #Then I am on new window with url https://help.form.io/intro/welcome/

#Scenario: Using the Welcome Module
    #Given I am logged in for profileuser1 
    #And I am on /#/   
    #When I click on the How it works with https://help.form.io/intro/howworks/
    #And I wait 2000 milliseconds
    #Then I am on new window with url https://help.form.io/intro/howworks/

#Scenario: Using the Welcome Module
    #Given I am logged in for profileuser1 
    #And I am on /#/   
    #When I click on the 30 minute guide with https://help.form.io/intro/guide/
    #And I wait 2000 milliseconds
    #Then I am on new window with url https://help.form.io/intro/guide/

#Scenario: Using the Welcome Module
    #Given I am logged in for profileuser1 
    #And I am on /#/   
    #When I click on the Developer Info with https://help.form.io/developer/info/welcome/
    #And I wait 2000 milliseconds
    #Then I am on new window with url https://help.form.io/developer/info/welcome/

#Scenario: Using the Welcome Module
    #Given I am logged in for profileuser1 
    #And I am on /#/   
    #When I click on the Tutorials with https://help.form.io/tutorials/videos/welcome/
    #And I wait 2000 milliseconds
    #Then I am on new window with url https://help.form.io/tutorials/videos/welcome/

Scenario: Using the Welcome Module
    Given I am logged in for profileuser1 
    And I am on /#/
    And I wait 2000 milliseconds
    When I click on the playicon
    And I wait 1000 milliseconds
#Then I see video is playing

Scenario: Portal Documentation/Links
    Given I am logged in for profileuser1
    And I am on /#/
    When My project count is zero
    Then I am on the Step 1: Create your project project portal
    When I click on the Getting Started Guide link
    Then I am on new window with url https://help.form.io/intro/explore/

Scenario: Teams messaging on portal
    Given I am logged in for profileuser1s
    And I am on /#/
    When My project count is zero
    Then I see the plaintext Want to work collaboratively? Upgrade a project to TeamPro to enable Team functionality.
   