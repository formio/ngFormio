module.exports = function (actions) {
  describe('Project Update Setting Functionality', function () {
    describe('Project Settings', function () {

      var val = [
        ['Test Project', '#title', '.project.well>h4>a', 'Test Project'],
        ['Test Description', '#description', '.project-description', '${project3.title}']
      ];

      actions.logout();
      actions.iAmLoggedInFor('projuser2');
      actions.goToPage("#/");
      actions.projectExisting('${random-title>project3.title}', '${random-description>project3.description}');
      actions.iSeeTextIn('.project.well>h4>a', '${project3.title}');

      val.forEach(function (settings) {
        actions.clickOnLink('Manage');
        actions.portalIamOn('${project3.title}');
        actions.clickOnClass('fa-cog');
        actions.enterTextInField(settings[1], settings[0]);
        actions.clickOnButton('Save Project');
        actions.portalIamOn('${project3.title}');
        actions.goToPage("#/");
        actions.iSeeValueIn(settings[2], settings[3]);
      });
    });
  });
}
