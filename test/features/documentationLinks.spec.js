module.exports = function (actions) {
  describe('Documentation Links ',function () {
    describe('Expanding the ‘Documentation’ button',function(){
     actions.goToPage('#/auth');
     actions.clickOnElementWithText(' Docs');
     var listElements = ['.fa-rocket','.fa-info-circle','.fa-laptop',
       '.fa-server','.fa-book','.fa-code','.fa-cloud-upload','.fa-github','.fa-cubes','.fa-terminal',
       '.fa-check-square-o','.fa-envelope','.fa-file','.fa-user','.fa-amazon','.fa-copy','.fa-cogs',
       '.fa-wifi','.fa-exchange','.fa-cloud'];
      listElements.forEach(function(listElement){
        actions.iSeeElement(listElement);
      });
     });

     describe('Collapsing the ‘Documentation’ button',function(){
     actions.goToPage('#/auth');
     actions.clickOnElementWithText(' Docs');
     actions.iSeeElement('.docs-dropdown');
     actions.clickOnElementWithText(' Docs');
     actions.iDonotSeeElement('.docs-dropdown');
     });

    describe('Navigating to documentation links ', function () {
      var documentLinks = [
        [' Getting Started','https://help.form.io/intro/welcome/'],
        [' How it works','https://help.form.io/intro/howworks/'],
        [' User Guide','https://help.form.io/userguide/introduction/'],
        [' Application Development','https://help.form.io/intro/appdev/'],
        [' 30 minute guide','https://help.form.io/intro/guide/'],
        [' Developer Section','https://help.form.io/developer/info/welcome/'],
        [' API Docs','https://documenter.getpostman.com/view/684631/formio-api/2Jvuks'],
        [' Github Projects','https://github.com/formio'],
        [' App Libraries','https://help.form.io/developer/libraries/angular/'],
        [' CLI Tool','https://help.form.io/developer/libraries/cli/'],
        [' Walkthroughs','https://help.form.io/tutorials/walkthroughs/eventmanager/'],
        [' Email Providers','https://help.form.io/developer/integrations/email/'],
        [' File Storage Providers','https://help.form.io/developer/integrations/filestorage/'],
        [' OAuth Providers','https://help.form.io/developer/integrations/oauth/'],
        [' AWS Lamba','https://help.form.io/developer/info/lambda/'],
        [' Auth0','https://help.form.io/developer/info/auth0/'],
        [' Application Cloning','https://help.form.io/developer/info/bootstrap/'],
        [' Form Actions','https://help.form.io/userguide/actions/'],
        [' Offline Mode','https://help.form.io/developer/info/offline/'],
        [' Staging and Deploying','https://help.form.io/userguide/staging/'],
        [' On-Premise','https://help.form.io/userguide/environments/']
      ];
      documentLinks.forEach(function(documentLink){
        actions.goToPage('#/auth');
        actions.clickOnElementWithText(' Docs');
        actions.iSeeElement('.docs-dropdown');
        actions.clickOnElementWithText(documentLink[0]);
        actions.switchTab();
        actions.checkingUrlIamOn(documentLink[1]);
        actions.closeWindow();
      });
    });
  });
}
