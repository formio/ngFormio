module.exports = function (actions) {
  describe('Documentation Links ',function () {
     describe('Collapsing the ‘Documentation’ button',function(){
        actions.goToPage('#/auth');
        actions.clickOnElementWithText(' Docs');
        actions.iSeeElement('.docs-dropdown');
        actions.clickOnElementWithText(' Docs');
        actions.iDonotSeeElement('.docs-dropdown');
     });
    describe('Navigating to documentation links ', function () {
      var documentLinks = [
        [' Getting Started','https://help.form.io/intro/welcome/','Welcome to <'],
        [' How it works','https://help.form.io/intro/howworks/','How it works'],
        [' User Guide','https://help.form.io/userguide/introduction/','Intro'],
        [' Application Development','https://help.form.io/intro/appdev/','Application Development'],
        [' 30 minute guide','https://help.form.io/intro/guide/','Up & Running'],
        [' Developer Section','https://help.form.io/developer/welcome/','Welcome'],
        [' API Docs','https://documenter.getpostman.com/view/684631/formio-api/2Jvuks','Form.io API'],
        [' Github Projects','https://github.com/formio','Form.io'],
        [' App Libraries','https://help.form.io/developer/libraries/','Integration Libraries'],
        [' CLI Tool','https://github.com/formio/formio-cli/','The Form.io command line interface.'],
        [' Walkthroughs','https://help.form.io/tutorials/walkthroughs/eventmanager/','Building a Basic Event Management System'],
        [' Email Providers','https://help.form.io/integrations/email/','Email'],
        [' File Storage Providers','https://help.form.io/integrations/filestorage/','File Storage'],
        [' OAuth Providers','https://help.form.io/integrations/oauth/','OAuth Authentication'],
        [' AWS Lamba','https://help.form.io/developer/lambda/','AWS Lambda'],
        [' Auth0','https://help.form.io/integrations/oauth/','OAuth Authentication'],
        [' Form Actions','https://help.form.io/userguide/actions/','Actions'],
        [' Offline Mode','https://help.form.io/developer/offline/','Offline Plugin'],
        [' Staging and Deploying','https://help.form.io/userguide/staging/','Staging'],
        [' On-Premise','https://help.form.io/userguide/environments/','On-Premise Environments']
      ];
      documentLinks.forEach(function(documentLink){
        actions.goToPage('#/auth');
        actions.clickOnElementWithText(' Docs');
        actions.iSeeElement('.docs-dropdown');
        actions.clickOnElementWithText(documentLink[0]);
        actions.switchTab();
        actions.checkingUrlIamOn(documentLink[1]);
        actions.iSeeText(documentLink[2]);
        actions.closeWindow();
      });
    });
  });
}
