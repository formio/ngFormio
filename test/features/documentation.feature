Feature : Documentation Feature

  Scenario: Expanding the Documentation button
    Given I am on the /#/auth page 
    When I click on the Docs link
    Then I see the .fa-rocket element
    Then I see the .fa-info-circle element
    Then I see the .fa-laptop element
    Then I see the .fa-server element
    Then I see the .fa-book element
    Then I see the .fa-code element
    Then I see the .fa-cloud-upload element
    Then I see the .fa-github element
    Then I see the .fa-cubes element
    Then I see the .fa-terminal element
    Then I see the .fa-server element
    Then I see the .fa-check-square-o element
    Then I see the .fa-envelope element
    Then I see the .fa-file element
    Then I see the .fa-user element
    Then I see the .fa-amazon element
    Then I see the .fa-copy element
    Then I see the .fa-cogs element
    Then I see the .fa-wifi element
    Then I see the .fa-ship element
    When I click on the #content element
    Then I do not see the .docs-dropdown element

  Scenario Outline: Navigating to documentation links
    Given I am on the /#/auth page 
    When I click on the Docs link
    When I click on the [link1] link
    Then I am on new window with url [link2]

  Examples:
    |link1                                   |link2                                                           |
    |Getting Started                         |https://help.form.io/intro/welcome/                             |
    |How it works                            |https://help.form.io/intro/howworks/                            |
    |User Guide                              |https://help.form.io/userguide/introduction/                    |
    |Application Development                 |https://help.form.io/intro/appdev/                              |
    |30 minute guide                         |https://help.form.io/intro/guide/                               |
    |Developer Section                       |https://help.form.io/developer/info/welcome/                    |
    |API Docs                                |https://documenter.getpostman.com/view/684631/formio-api/2Jvuks |
    |Github Projects                         |https://github.com/formio                                       |
    |App Libraries                           |https://help.form.io/developer/libraries/angular/               |
    |CLI Tool                                |https://help.form.io/developer/libraries/cli/                   |
    |Walkthroughs                            |https://help.form.io/tutorials/walkthroughs/eventmanager/       |
    |Email Providers                         |https://help.form.io/developer/integrations/email/              |
    |File Storage Providers                  |https://help.form.io/developer/integrations/filestorage/        |
    |OAuth Providers                         |https://help.form.io/developer/integrations/oauth/              |
    |AWS Lamba                               |https://help.form.io/developer/info/lambda/                     |
    |Auth0                                   |https://help.form.io/developer/info/auth0/                      |
    |Application Cloning                     |https://help.form.io/developer/info/bootstrap/                  |
    |Form Actions                            |https://help.form.io/userguide/actions/                         |
    |Offline Mode                            |https://help.form.io/developer/info/offline/                    |
    |Docker Deployments                      |https://help.form.io/userguide/docker/                          |
 