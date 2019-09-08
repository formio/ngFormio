const NestedComponent = Formio.Components.components.nested;
class ResourceFieldsComponent extends NestedComponent {
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
        onChange(context) {
          if (!context.instance.data.resource) {
            return;
          }
          Formio.request(`${Formio.getProjectUrl()}/form/${context.instance.data.resource}`).then((result) => {
            const dynamicFields = context.instance.root.getComponent('dynamic');
            dynamicFields.destroyComponents();
            const formFields = [];
            FormioUtils.eachComponent(context.instance.options.currentForm.components, (component) => {
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
                }, context.instance.data);
              }
            });
            dynamicFields.redraw();
          });
        },
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
            type: 'nested',
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
}

Formio.registerComponent('resourcefields', ResourceFieldsComponent);
