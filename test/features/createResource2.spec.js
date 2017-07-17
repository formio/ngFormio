module.exports = function(actions){
  describe('Create Resource2' ,function(){

    describe('Message',function(){
      var msg= ['Form path cannot contain one of the following names: submission, report, version, tag, exists, export, import, clone, deploy, wipe, role, current, logout, form, token, logs, classic, storage/s3, storage/dropbox, dropbox/auth, upgrade, access, atlassian/oauth/authorize, atlassian/oauth/finalize, sqlconnector, token '];


      msg.forEach(function(message){
        actions.iAmLoggedInFor('projuser3');
        actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
        actions.goToPage("/#");
        actions.clickOnElementWithText('${project3.title}');
        actions.iSeeText(' Welcome');
        actions.clickOnElementWithText('Resources');
        actions.iSeeText('Resources');
        actions.clickOnElementWithText(' New Resource');
        actions.iSeeText('New Resource');
        actions.enterTextInField('#title','Test Resource');
        //actions.iSeeTextIn('#name','testResource');
        actions.enterTextInField('#path','submission');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','report');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','exists');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','export');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','role');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','current');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','logout');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','import');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','form');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','storage/s3');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','storage/dropbox');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','dropbox/auth');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','upgrade');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','access');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','atlassian/oauth/authorize');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','atlassian/oauth/finalize ');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);
        actions.enterTextInField('#path','sqlconnector');
        actions.clickOnElement('.btn.btn-primary');
        //actions.iSeeTextIn(".alert",message);




      });



  });
  });
}
