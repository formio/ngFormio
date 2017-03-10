Scenario Outline: Updating Project Title/ Description
  Given I am logged in for projuser2
  And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
  And I am on /#/
  Then I see .project.well>h4>a with the text ${project3.title}
  When I click on the Manage button
  Then I am on the ${project3.title} project portal
  When I click on the #nav-bar-settings-link element
  And I enter [Text] in the [Field] field
  And I click on the Save Project button
  And I wait 1000 milliseconds
  Then I am on the [Title] project portal
  And I wait 1000 milliseconds
  When I click on the icon fa fa-home
  And I wait 1000 milliseconds
  And I am on /#/ 
  And I wait 1000 milliseconds
  Then I see [Element] with the text [Text]

 Examples:
  |Text                    |Field                     |Element                  |Title                |
  |Test Project            |#title                    |.project.well>h4>a       |Test Project         |
  |Test Description        |#description              |.project-description     |${project3.title}    |

Scenario Outline: Updating Preview git rep field/‘Preview App URL’ field
  Given I am logged in for projuser2
  And A project exists with the ${random-title>project3.title} and ${random-description>project3.description}
  And I am on /#/
  Then I see .project.well>h4>a with the text ${project3.title}
  When I click on the Manage button
  Then I am on the ${project3.title} project portal
  When I click on the #nav-bar-settings-link element
  And I enter [Text] in the [Field] field
  And I click on the Save Project button
  And I wait 1000 milliseconds
  When I click on the #nav-bar-settings-link element
  And I wait 1000 milliseconds
  Then I see [Text] in the [Field] field

  Examples:
  |Text                    |Field                      |
  |Test Git Repo           |#preview-repo              |
  |Test Git Url            |#preview-url               |



	