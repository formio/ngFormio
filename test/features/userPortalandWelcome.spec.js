module.exports = function (actions) {
  describe('User Portal Links and Welcome Module',function(){
    describe('Closing the Welcome Module',function(){
      actions.logout();
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      actions.iSeeText('Welcome to ');
      actions.clickOnElement('.fa-close');
      actions.iDonotSeeText('Welcome to ');
    });
    describe('Welcome module when Project count is zero',function(){
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      actions.projectCount(0);
      actions.iSeeText('Welcome to ');
      actions.iSeeText(' Getting Started');
      actions.iSeeText(' How it works');
      actions.iSeeText(' 30 minute guide');
      actions.iSeeText(' Developer Info');
      actions.iSeeText(' Tutorials');
    });
    describe('Using the Welcome Module',function(){
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      var documentLinks = [
        [' Getting Started','https://help.form.io/intro/welcome/'],
        [' How it works','https://help.form.io/intro/howworks/'],
        [' 30 minute guide','https://help.form.io/intro/guide/'],
        [' Developer Info','https://help.form.io/developer/info/welcome/'],
        [' Tutorials','https://help.form.io/tutorials/videos/welcome/']
      ];
      documentLinks.forEach(function(documentLink){
        actions.clickBtnWithLink(documentLink[0],documentLink[1]);
        actions.newWindow();
        actions.checkingUrlIamOn(documentLink[1]);
        actions.closeWindow();
      });
    });
    describe('Teams messaging on portal',function(){
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      actions.projectCount(0);
      actions.iSeeText("Want to work collaboratively? Create a team to allow others to help work on your project.");
    });
  });
};
