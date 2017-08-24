module.exports = function (actions) {
  describe('Project Settings Functionality', function () {
    describe('Project Creation', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser1');
      actions.goToPage('#/');
      actions.clickOnClass('new-project-custom');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>project1.title}');
      actions.enterTextInField('#description', '${random-description>project1.description}');
      actions.clickOnElementWithText(' Create Project');
    });

    describe('Project Creation', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser1');
      actions.goToPage('#/');
      actions.clickOnClass('new-project-custom');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.btnDisabled(' Create Project');
    });

    describe('Project Creation', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser1');
      actions.goToPage('#/');
      actions.clickOnClass('new-project-custom');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>project1.title}');
      actions.clickOnElementWithText(' Create Project');
    });

    describe('Character Limits', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser1');
      actions.goToPage('#/');
      actions.clickOnClass('new-project-custom');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '1234567890123456789012345678901234567890123456789012345678901234');
      actions.iSeeText('Project Title cannot be longer than 63 characters.');
    });

    describe('Save project settings', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser2');
      actions.goToPage("#/");
      actions.projectExisting('${random-title>project3.title}', '${random-description>project3.description}');
      actions.iSeeTextIn('.project.well>h4>a', '${project3.title}');
      actions.clickOnLink('Manage');
      actions.portalIamOn('${project3.title}');
      actions.clickOnClass('fa-cog');
      actions.clickOnButton('Save Project');
      actions.iSeeTextIn('.toast-message', 'Project settings saved.');
    });

    describe('Cant save project after removing title', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser4');
      actions.goToPage("#/");
      actions.projectExisting('${random-title>project4.title}', '${random-description>project4.description}');
      actions.iSeeTextIn('.project.well>h4>a', '${project4.title}');
      actions.clickOnLink('Manage');
      actions.portalIamOn('${project4.title}');
      actions.clickOnClass('fa-cog');
      actions.enterTextInField('#title', '${empty}');
      actions.btnDisabled(' Save Project');
    });

    describe('Can save project after removing its description', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser5');
      actions.goToPage("#/");
      actions.projectExisting('${random-title>project5.title}', '${random-description>project5.description}');
      actions.iSeeTextIn('.project.well>h4>a', '${project5.title}');
      actions.clickOnLink('Manage');
      actions.portalIamOn('${project5.title}');
      actions.clickOnClass('fa-cog');
      actions.enterTextInField('#description', '${empty}');
      actions.clickOnButton('Save Project');
      actions.iSeeTextIn('.toast-message', 'Project settings saved.');
    });

    describe('Deleting a project warning', function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser7');
      actions.goToPage("#/");
      actions.clickOnClass('fa-close');
      actions.projectExisting('${random-title>project7.title}', '${random-description>project7.description}');
      actions.iSeeTextIn('.project.well>h4>a', '${project7.title}');
      actions.clickOnLink('Manage');
      actions.portalIamOn('${project7.title}');
      actions.clickOnClass('fa-cog');
      actions.iSeeText("To remove this project and all of it\'s environments, select this delete button.");
      actions.iSeeTextIn('.btn.btn-danger.ng-binding', 'Delete ${project7.title} Project');
      actions.clickOnElementWithText('Delete ${project7.title} Project');
      actions.iSeeText('Are you sure you wish to delete the Project ');
      actions.iSeeTextIn('.btn.btn-danger', 'Yes');
      actions.clickOnElementWithText(' Yes');
      actions.iSeeTextIn('.toast-message', 'Project was deleted!');
    });
  });
};
