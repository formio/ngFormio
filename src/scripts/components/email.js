// Modify the Email form to add Kickbox settings.
const EmailComponent = Formio.Components.components.email;
class FormioEmailComponent extends EmailComponent {
  static get builderInfo() {
    const builderInfo = EmailComponent.builderInfo;
    builderInfo.help = `<h4><i class="fa fa-info-circle"></i> Did you know?</h4>
  <p>You can automatically validate all of your emails with our <a href="https://kickbox.io" target="_blank">Kickbox.io</a> integration. <a href="https://help.form.io/developer/integrations/email/#kickbox" target="_blank">Click here to learn more</a>.</p>`;
    return builderInfo;
  }

  static editForm(...args) {
    const editForm = EmailComponent.editForm(...args);
    const validationTab = FormioUtils.getComponent(editForm.components, 'validation', true);
    validationTab.components = [{
      type: 'panel',
      title: 'Kickbox',
      components: [
        {
          type: 'content',
          html: '<p>Validate this email using the Kickbox email validation service.</p>'
        },
        {
          type: 'checkbox',
          key: 'kickbox.enabled',
          label: 'Enabled',
          tooltip: 'Enable KickBox validation for this email field.'
        }
      ]
    }].concat(validationTab.components);
    return editForm;
  }
}
Formio.Components.components.email = FormioEmailComponent;
