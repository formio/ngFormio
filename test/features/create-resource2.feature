Feature: Test 16 Creating/Editing A Resource part2

  Background:
    Given I am logged in for profileuser3
    And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
    And I am on the ${project3.title} project overview page
    When I click on the Resources link
    Then I am on the resource page of ${project3.title} project

  Scenario Outline: Attempt to create a new ‘Resource’ with invalid path name [name]
    When I click on the Create Resource link
    Then I see the plaintext New Resource
    When I enter Test Resource in the #title field
    Then I see an input #name with the value testResource
    When I enter submission in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter report in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter exists in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter export in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter role in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter current in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter logout in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter import in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter form in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter storage/s3 in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter storage/dropbox in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter dropbox/auth in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter upgrade in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter access in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter atlassian/oauth/authorize in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter atlassian/oauth/finalize in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter sqlconnector in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    Then I am on the resource page of ${project3.title} project
    When I click on the Resources link
    Then I am on the resource page of ${project3.title} project
    And I donot see Test Resource resource

    Examples:

      | message                                                                                                                                                                                                                                                     |
      | Form path cannot contain one of the following names: submission, report, version, tag, exists, export, import, clone, deploy, wipe, role, current, logout, form, token, logs, classic, storage/s3, storage/dropbox, dropbox/auth, upgrade, access, atlassian/oauth/authorize, atlassian/oauth/finalize, sqlconnector, token |

  Scenario: Editing an existing ‘Resource’
    When I click on the Create Resource link
    Then I see the plaintext New Resource
    When I enter Test Resource in the #title field
    Then I see an input #name with the value testResource
    When I enter testResource in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text Successfully created form!
    When I click on notification
    When I click on the Resources link
    Then I am on the resource page of ${project3.title} project
    And I can see Test Resource in the Resources section
    When I click on the Test Resource link
    Then I am on the edit page of ${project3.title} project
    When I enter Edit Resource in the #title field
    Then I see an input #name with the value editResource
    When I enter editresource in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text Successfully updated form!
    When I click on the Resources link
    Then I am on the resource page of ${project3.title} project
    And I can see Edit Resource in the Resources section
    When I click on the fa fa-code button for Edit Resource form
    Then I am on the api page of ${project3.title} project
    Then I see editresource for Form Endpoint in the table

  Scenario Outline: Attempt to update an existing ‘Resource’ with invalid path name [name]
    When I click on the Create Resource link
    Then I see the plaintext New Resource
    When I enter Edit Resource in the #title field
    Then I see an input #name with the value editResource
    When I enter editResource in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text Successfully created form!
    When I click on notification
    When I click on the Resources link
    Then I am on the resource page of ${project3.title} project
    And I can see Edit Resource in the Resources section
    When I click on the Edit Resource link
    When I enter Test Resource in the #title field
    Then I see an input #name with the value testResource
    When I enter submission in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter report in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter exists in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter export in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter role in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter current in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter logout in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter import in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter form in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter storage/s3 in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter storage/dropbox in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter dropbox/auth in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter upgrade in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter access in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter atlassian/oauth/authorize in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter atlassian/oauth/finalize in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I enter sqlconnector in the #path field
    And I click on the Save Resource input button
    Then I see a notification with the text [message]
    When I click on notification
    When I click on the Resources link
    Then I am on the resource page of ${project3.title} project
    And I can see Edit Resource in the Resources section

    Examples:

      | message                                                                                                                                                                                                                                                     |
      | Form path cannot contain one of the following names: submission, report, version, tag, exists, export, import, clone, deploy, wipe, role, current, logout, form, token, logs, classic, storage/s3, storage/dropbox, dropbox/auth, upgrade, access, atlassian/oauth/authorize, atlassian/oauth/finalize, sqlconnector, token |

  Scenario:  Attempt to Edit an existing Resource with blank fields
    When I click on the Create Resource link
    Then I see the plaintext New Resource
    When I enter Edit Resource in the #title field
    Then I see an input #name with the value editResource
    When I enter editResource in the #path field
    And I click on the Create Resource input button
    Then I see a notification with the text Successfully created form!
    When I click on notification
    When I click on the Resources link
    Then I am on the resource page of ${project3.title} project
    And I can see Edit Resource in the Resources section
    When I click on the Edit Resource link
    And I enter Test Resource in the #title field
    And I clear the #path field
    Then I see an input #name with the value testResource
    When I click on the Save Resource input button
    Then I see a notification with the text Path `path` is required.
    When I click on notification
    When I enter testResource in the #path field
    And I clear the #title field
    And I enter testResource in the #name field
    And I click on the Save Resource input button
    Then I see a notification with the text Path `title` is required.
    When I click on notification
    Then I am on the edit page of ${project3.title} project

  Scenario: Adding Form Tags
    When I click on the glyphicon glyphicon-edit button for User form
    When I click on the Advanced Settings link
    Then I see the Form Tags component
    When I enter test in the //*[contains(@placeholder,"Add a tag")] field
    And I click on the Advanced Settings link
    And I click on the Advanced Settings link
    Then I see span text test in the field Form Tags


  Scenario: Adding Custom Action URL
    When I click on the glyphicon glyphicon-edit button for User form
    When I click on the Advanced Settings link
    Then I see the Custom Action URL component
    When I enter test.com in the //*[contains(@placeholder,"Enter the custom submission URL.")] field
    And I click on the Advanced Settings link
    And I click on the Advanced Settings link
    Then I see an input //*[contains(@placeholder,"Enter the custom submission URL.")] with the value test.com
