import { Formio } from 'ng-formio/lib/modules';
const NestedDataComponent = Formio.Components.components.nesteddata;
class ResourceFieldsComponent extends NestedDataComponent {
  constructor(component, options, data) {
    component.components = [
      {
        type: 'select',
        label: 'Save submission to',
        authenticate: true,
        valueProperty: '_id',
        template: '<span>{{ item.title }}</span>',
        searchField: 'title',
        key: 'resource',
        dataSrc: 'url',
        lazyLoad: false,
        tooltip: 'Select the Resource to save submissions to.',
        data: {
          url: `${Formio.getProjectUrl()}/form?type=resource&limit=4294967295&select=_id,title`
        }
      },
      {
        label: 'Resource Property',
        key: 'property',
        inputType: 'text',
        input: true,
        placeholder: 'Assign this resource to the following property',
        prefix: '',
        suffix: '',
        type: 'textfield',
        conditional: {
          json: { var: 'data.settings.resource' }
        }
      },
      {
        legend: 'Resource Fields',
        key: 'resourceFields',
        type: 'fieldset',
        components: [
          {
            type: 'well',
            components: [
              {
                type: 'content',
                html: 'Below are the fields within the selected resource. For each of these fields, select the corresponding field within this form that you wish to map to the selected Resource.'
              }
            ]
          },
          {
            type: 'panel',
            title: 'Field Mappings',
            key: 'dynamic',
            components: []
          }
        ],
        conditional: {
          json: { var: 'data.settings.resource' }
        }
      }
    ];
    super(component, options, data);
  }

  setValue(value, flags) {
    const changed = super.setValue(value, flags);
    if (value.resource) {
      Formio.request(`${Formio.getProjectUrl()}/form/${value.resource}`).then((result) => {
        const dynamicFields = this.getComponent('dynamic');
        dynamicFields.destroyComponents();
        const formFields = [];
        FormioUtils.eachComponent(this.options.currentForm.components, (component) => {
          if (component.type !== 'button') {
            formFields.push({
              value: component.key,
              label: component.label
            });
          }
        });

        FormioUtils.eachComponent(result.components, (component) => {
          if (component.type !== 'button') {
            dynamicFields.addComponent({
              type: 'select',
              input: true,
              label: component.label,
              key: `fields.${component.key}`,
              dataSrc: 'values',
              data: {values: formFields},
              validate: {
                required: component.validate ? (component.validate.required) : false
              }
            }, this.data);
          }
        });
        dynamicFields.redraw();
      });
    }
    return changed;
  }
}

Formio.registerComponent('resourcefields', ResourceFieldsComponent);
