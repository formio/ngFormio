module.exports = function (actions,tags) {
  tags('smoke').describe('User Portal Links and Welcome Module ',function(){
    describe('Closing the Welcome Module',function(){
      actions.goToPage('#/');
      actions.logout();
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      actions.iSeeText('Welcome to ');
      actions.clickOnElement('.fa-close');
      actions.iDonotSeeText('Welcome to ');
    });
    describe('Using the Welcome Module',function(){
      actions.logout();
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      var documentLinks = [
        [' Getting Started','https://help.form.io/intro/welcome/','Welcome to <',1],
        [' How it works','https://help.form.io/intro/howworks/','How it works',1],
        [' 30 minute guide','https://help.form.io/intro/guide/','Create your Project',1],
        [' Developer Info','https://help.form.io/developer/welcome/','Welcome',1],
        [' Tutorials','https://help.form.io/tutorials/videos/welcome/','Welcome',0]
      ];
      documentLinks.forEach(function(documentLink){
        actions.clickOnElementWithTextIndex(documentLink[0],documentLink[3]);
        actions.newWindow();
        actions.checkingUrlIamOn(documentLink[1]);
        actions.iSeeText(documentLink[2]);
        actions.closeWindow();
      });
    });
    describe('Teams documentation on Portal',function(){
      actions.logout();
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      actions.projectCount(0);
      actions.iSeeText("Want to work collaboratively? Create a team to allow others to help work on your project.");
      actions.clickOnClassWithIndex('.fa.fa-info-circle',1);
      actions.newWindow();
      actions.checkingUrlIamOn('https://help.form.io/userguide/teams/');
      actions.closeWindow();
      actions.logout();
    });
  });
};
