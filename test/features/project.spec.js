module.exports = function (actions) {
  describe('Project Settings Functionality', function () {
    describe('Navigating to the Project Settings', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser1');
      actions.goToPage('#/');
      actions.clickOnElementWithText('New Project');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>project1.title}');
      actions.enterTextInField('#description', '${random-description>project1.description}');
      actions.clickOnButton('Create Project');
      actions.waitForActionToComplete(2000);
      // actions.portalIamOn('${project3.title}');
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title', '${project1.title}');
      actions.iSeeValueIn('#description', '${project1.description}');
      actions.iSeeText('AngularJS');
      actions.iSeeText('Delete Project');
      actions.iSeeText('Plan and Pricing');
      actions.iSeeText('Teams');
    });
    describe('Attempting to save a project with no title', function () {
      actions.enterTextInField('#title','');
      actions.btnDisabled(' Save Project');
    });
    describe('Editing Project Title', function () {
      actions.enterTextInField('#title','Updated Title');
      actions.clickOnButton(' Save Project');
      actions.iSeeTextIn('.toast-message', 'Project settings saved.');
      actions.clickOnClass('.toast-message');
      // actions.portalIamOn('Updated Title');
      actions.iSeeText('Updated Title');
      actions.clickOnClass('.fa-home');
      actions.iSeeText('Updated Title');
      actions.clickOnElementWithText('Updated Title');
      // actions.portalIamOn('Updated Title');
      actions.waitForActionToComplete(1000);
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title','Updated Title');
      actions.iSeeText('Delete Updated Title Project');
    });
    describe('Editing Project Description', function () {
      actions.enterTextInField('#description','Updated Description');
      actions.clickOnButton(' Save Project');
      actions.iSeeTextIn('.toast-message', 'Project settings saved.');
      actions.clickOnClass('.toast-message');
      // actions.portalIamOn('Updated Title');
      actions.iSeeText('Updated Title');
      actions.clickOnClass('.fa-home');
      actions.iSeeText('Updated Title');
      actions.clickOnElementWithText('Updated Title');
      // actions.portalIamOn('Updated Title');
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title','Updated Title');
      actions.iSeeValueIn('#description','Updated Description');
    });
    describe('Editing Project Framework type', function () {
      actions.clickOnClass('i.caret.pull-right');
      actions.clickOnElementWithText('React.js');
      actions.clickOnButton(' Save Project');
      actions.iSeeTextIn('.toast-message', 'Project settings saved.');
      actions.clickOnClass('.toast-message');
      // actions.portalIamOn('Updated Title');
      actions.iSeeText('Updated Title');
      actions.clickOnClass('.fa-home');
      actions.iSeeText('Updated Title');
      actions.clickOnElementWithText('Updated Title');
      // actions.portalIamOn('Updated Title');
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title','Updated Title');
      actions.iSeeValueIn('#description','Updated Description');
      actions.iSeeText('React.js');
    });
    describe('Deleting a Project', function () {
      actions.iSeeText("To remove this project and all of it\'s environments, select this delete button.");
      actions.iSeeValueIn('.btn.btn-danger.ng-binding', 'Delete Updated Title Project');
      actions.clickOnElementWithText('Delete Updated Title Project');
      actions.checkingUrlEndsWith('/delete');
      actions.iSeeText('Are you sure you wish to delete the Project ');
      actions.clickOnElementWithText('No');
      actions.checkingUrlEndsWith('/settings');
      actions.clickOnElementWithText('Delete Updated Title Project');
      actions.iSeeValueIn('.btn.btn-danger', 'Yes');
      actions.clickOnElementWithText(' Yes');
      actions.iSeeTextIn('.toast-message', 'Project was deleted!');
      actions.clickOnClass('.toast-message');
      actions.iDonotSeeText('Updated Title');
    });
    describe('Attempt to save Project Settings with long Project Title', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser1');
      actions.goToPage('#/');
      actions.clickOnElementWithText('New Project');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>project1.title}');
      actions.enterTextInField('#description', '${random-description>project1.description}');
      actions.clickOnButton('Create Project');
      // actions.portalIamOn('${project3.title}');
      actions.clickOnClass('.fa.fa-cog');
      actions.enterTextInField('#title', 'This is a very very very very very very very very very long title');
      actions.iSeeText('Stage Title cannot be longer than 63 characters.');
      actions.btnDisabled(' Save Project');
    });
    describe('Attempt to save Project Settings with long Project Description', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser1');
      actions.goToPage('#/');
      actions.clickOnElementWithText('New Project');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>project1.title}');
      actions.enterTextInField('#description', '${random-description>project1.description}');
      actions.clickOnButton('Create Project');
      // actions.portalIamOn('${project3.title}');
      actions.clickOnClass('.fa.fa-cog');
      actions.enterTextInField('#description', 'This is a very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long description');
      actions.iSeeText('Description cannot be longer than 512 characters.');
      actions.btnDisabled(' Save Project');
    });
    // describe('Project Creation', function () {
    //   actions.logout();
    //   actions.iAmLoggedInFor('projuser1');
    //   actions.goToPage('#/');
    //   actions.clickOnElementWithText('New Project');
    //   actions.iSeeText('Project Title');
    //   actions.iSeeText('Description');
    //   actions.enterTextInField('#title', '${random-title>project1.title}');
    //   actions.enterTextInField('#description', '${random-description>project1.description}');
    //   actions.clickOnButton('Create Project');
    // });
    //
    // describe('Project Creation', function () {
    //   actions.logout();
    //   actions.iAmLoggedInFor('projuser1');
    //   actions.goToPage('#/');
    //   actions.clickOnElementWithText('New Project');
    //   actions.iSeeText('Project Title');
    //   actions.iSeeText('Description');
    //   actions.btnDisabled(' Create Project');
    // });
    //
    // describe('Project Creation', function () {
    //   actions.logout();
    //   actions.iAmLoggedInFor('projuser1');
    //   actions.goToPage('#/');
    //   actions.clickOnElementWithText('New Project');
    //   actions.iSeeText('Project Title');
    //   actions.iSeeText('Description');
    //   actions.enterTextInField('#title', '${random-title>project1.title}');
    //   actions.clickOnButton('Create Project');
    // });
    //
    //
    // describe('Save project settings', function () {
    //   actions.logout();
    //   actions.iAmLoggedInFor('projuser2');
    //   actions.goToPage("#/");
    //   actions.projectExisting('${random-title>project3.title}', '${random-description>project3.description}');
    //   actions.iSeeTextIn('.project.well>h4>a', '${project3.title}');
    //   actions.clickOnButton('Manage');
    //   actions.portalIamOn('${project3.title}');
    //   actions.clickOnClass('.fa.fa-cog');
    //   actions.clickOnButton('Save Project');
    //   actions.iSeeTextIn('.toast-message', 'Project settings saved.');
    // });
    //
    // describe('Cant save project after removing title', function () {
    //   actions.logout();
    //   actions.iAmLoggedInFor('projuser4');
    //   actions.goToPage("#/");
    //   actions.projectExisting('${random-title>project4.title}', '${random-description>project4.description}');
    //   actions.iSeeTextIn('.project.well>h4>a', '${project4.title}');
    //   actions.clickOnButton('Manage');
    //   actions.portalIamOn('${project4.title}');
    //   actions.clickOnClass('.fa.fa-cog');
    //   actions.enterTextInField('#title', '${empty}');
    //   actions.btnDisabled(' Save Project');
    // });
    //
    // describe('Can save project after removing its description', function () {
    //   actions.logout();
    //   actions.iAmLoggedInFor('projuser5');
    //   actions.goToPage("#/");
    //   actions.projectExisting('${random-title>project5.title}', '${random-description>project5.description}');
    //   actions.iSeeTextIn('.project.well>h4>a', '${project5.title}');
    //   actions.clickOnButton('Manage');
    //   actions.portalIamOn('${project5.title}');
    //   actions.clickOnClass('.fa.fa-cog');
    //   actions.enterTextInField('#description', '${empty}');
    //   actions.clickOnButton('Save Project');
    //   actions.iSeeTextIn('.toast-message', 'Project settings saved.');
    // });
    //

  });
};
