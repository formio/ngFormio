module.exports = function (actions) {
  describe('Create Resource2', function () {

    describe('Attempt to create a new ‘Resource’ with invalid path name', function () {
      var message = 'Form path cannot contain one of the following names: submission, report, version, tag, exists, export, import, clone, deploy, wipe, role, current, logout, form, token, logs, classic, storage/s3, storage/dropbox, dropbox/auth, upgrade, access, atlassian/oauth/authorize, atlassian/oauth/finalize, sqlconnector, token';
      var path = ['submission', 'report', 'exists', 'export', 'role', 'current', 'logout', 'import', 'form', 'storage/s3', 'storage/dropbox', 'dropbox/auth', 'upgrade', 'access', 'atlassian/oauth/authorize', 'atlassian/oauth/finalize', 'sqlconnector'];
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}', '${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('Manage');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeText('New Resource');
      path.forEach(function (value) {
        actions.enterTextInField('#title', 'Test Resource');
        actions.iSeeValueIn('#name', 'testResource');
        actions.enterTextInField('#path', value);
        actions.clickOnElement('xpath://*[@value="Create Resource"]');
        actions.iSeeTextIn(".toast-message", message);
        actions.clickOnElement(".toast-message");
      });
    });


    describe('Editing an existing Resource',function(){
      actions.logout();
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}', '${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('${project3.title}');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Resources');
    });
  });
}
